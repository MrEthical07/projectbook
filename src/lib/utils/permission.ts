import {
	PERMISSION_BITS_USED,
	getPermissionBit,
	permissionActionIndex,
	permissionActions,
	permissionDomainIndex,
	permissionDomains
} from "$lib/constants/permissions";

const NON_VIEW_ACTIONS: PermissionAction[] = [
	"create",
	"edit",
	"delete",
	"archive",
	"statusChange"
];

const emptyActionPermission: ActionPermission = {
	view: false,
	create: false,
	edit: false,
	delete: false,
	archive: false,
	statusChange: false
};

export const EMPTY_PERMISSION_MASK: PermissionMask = "0";
export const ALL_DEFINED_PERMISSION_MASK: PermissionMask = (
	(1n << BigInt(PERMISSION_BITS_USED)) - 1n
).toString();

const createEmptyPermissions = (): EffectivePermissions => ({
	project: { ...emptyActionPermission },
	story: { ...emptyActionPermission },
	problem: { ...emptyActionPermission },
	idea: { ...emptyActionPermission },
	task: { ...emptyActionPermission },
	feedback: { ...emptyActionPermission },
	resource: { ...emptyActionPermission },
	page: { ...emptyActionPermission },
	calendar: { ...emptyActionPermission },
	member: { ...emptyActionPermission }
});

const toMaskBigInt = (value: unknown): bigint => {
	if (typeof value === "bigint") {
		return value >= 0n ? value : 0n;
	}
	if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
		return BigInt(Math.trunc(value));
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return 0n;
		try {
			const parsed = BigInt(trimmed);
			return parsed >= 0n ? parsed : 0n;
		} catch {
			return 0n;
		}
	}
	return 0n;
};

const isActionPermission = (value: unknown): value is ActionPermission => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;
	return permissionActions.every((action) => typeof record[action] === "boolean");
};

const isEffectivePermissions = (value: unknown): value is EffectivePermissions => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;
	return permissionDomains.every((domain) => isActionPermission(record[domain]));
};

export const normalizePermissionMask = (value: unknown): PermissionMask =>
	toMaskBigInt(value).toString();

const resolveDomainIndex = (domain: PermissionDomain | number): number =>
	typeof domain === "number" ? domain : permissionDomainIndex[domain];

const resolveActionIndex = (action: PermissionAction | number): number =>
	typeof action === "number" ? action : permissionActionIndex[action];

export const hasPerm = (
	mask: PermissionMask | bigint | number | null | undefined,
	domain: PermissionDomain | number,
	action: PermissionAction | number
): boolean => {
	const domainIndex = resolveDomainIndex(domain);
	const actionIndex = resolveActionIndex(action);
	const bit = getPermissionBit(domainIndex, actionIndex);
	return (toMaskBigInt(mask) & bit) !== 0n;
};

export const updatePerm = (
	mask: PermissionMask | bigint | number | null | undefined,
	domain: PermissionDomain | number,
	action: PermissionAction | number,
	enabled: boolean
): PermissionMask => {
	const domainIndex = resolveDomainIndex(domain);
	const actionIndex = resolveActionIndex(action);
	const bit = getPermissionBit(domainIndex, actionIndex);
	const current = toMaskBigInt(mask);
	return (enabled ? current | bit : current & ~bit).toString();
};

export const applyPermissionDependencyRules = (
	mask: PermissionMask | bigint | number | null | undefined,
	domain: PermissionDomain | number,
	action: PermissionAction | number,
	enabled: boolean
): PermissionMask => {
	const domainIndex = resolveDomainIndex(domain);
	const actionIndex = resolveActionIndex(action);

	let next = updatePerm(mask, domainIndex, actionIndex, enabled);

	if (actionIndex === permissionActionIndex.view && !enabled) {
		for (const dependentAction of NON_VIEW_ACTIONS) {
			next = updatePerm(next, domainIndex, dependentAction, false);
		}
		return next;
	}

	if (actionIndex !== permissionActionIndex.view && enabled) {
		next = updatePerm(next, domainIndex, permissionActionIndex.view, true);
	}

	return next;
};

export const validatePermissionMask = (
	mask: bigint
): {
	valid: boolean;
	errors: string[];
} => {
	const normalizedMask = mask >= 0n ? mask : 0n;
	const errors: string[] = [];

	for (const domain of permissionDomains) {
		const domainIndex = permissionDomainIndex[domain];
		const hasView =
			(normalizedMask &
				getPermissionBit(domainIndex, permissionActionIndex.view)) !== 0n;

		let hasDependentAction = false;
		for (const dependentAction of NON_VIEW_ACTIONS) {
			if (
				(normalizedMask &
					getPermissionBit(domainIndex, permissionActionIndex[dependentAction])) !==
				0n
			) {
				hasDependentAction = true;
				break;
			}
		}

		if (hasDependentAction && !hasView) {
			errors.push(
				`Invalid permission: VIEW is required when other actions are enabled (domain: ${domain})`
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
};

export const validatePermissionMaskValue = (
	mask: PermissionMask | bigint | number | null | undefined
) => validatePermissionMask(toMaskBigInt(mask));

export const enforcePermissionMaskDependencies = (
	mask: PermissionMask | bigint | number | null | undefined
): PermissionMask => {
	let next = normalizePermissionMask(mask);

	for (const domain of permissionDomains) {
		const domainIndex = permissionDomainIndex[domain];
		const hasView = hasPerm(next, domainIndex, permissionActionIndex.view);

		let hasDependentAction = false;
		for (const dependentAction of NON_VIEW_ACTIONS) {
			if (hasPerm(next, domainIndex, permissionActionIndex[dependentAction])) {
				hasDependentAction = true;
				break;
			}
		}

		if (!hasView && hasDependentAction) {
			next = updatePerm(next, domainIndex, permissionActionIndex.view, true);
		}
	}

	return next;
};

export const permissionsToMask = (
	permissions: EffectivePermissions | undefined | null
): PermissionMask => {
	if (!permissions) return EMPTY_PERMISSION_MASK;
	let mask = 0n;
	for (const domain of permissionDomains) {
		for (const action of permissionActions) {
			if (permissions[domain][action]) {
				mask |= getPermissionBit(
					permissionDomainIndex[domain],
					permissionActionIndex[action]
				);
			}
		}
	}
	return mask.toString();
};

export const maskToPermissions = (
	mask: PermissionMask | bigint | number | null | undefined
): EffectivePermissions => {
	const resolvedMask = toMaskBigInt(mask);
	const permissions = createEmptyPermissions();
	for (const domain of permissionDomains) {
		for (const action of permissionActions) {
			permissions[domain][action] =
				(resolvedMask &
					getPermissionBit(
						permissionDomainIndex[domain],
						permissionActionIndex[action]
					)) !== 0n;
		}
	}
	return permissions;
};

export const rolePermissionsToMasks = (
	rolePermissions: RolePermissionMap
): RolePermissionMaskMap => {
	const result = {} as RolePermissionMaskMap;
	for (const role of Object.keys(rolePermissions) as ProjectRole[]) {
		result[role] = permissionsToMask(rolePermissions[role]);
	}
	return result;
};

export const rolePermissionMasksToPermissions = (
	rolePermissionMasks: RolePermissionMaskMap
): RolePermissionMap => {
	const result = {} as RolePermissionMap;
	for (const role of Object.keys(rolePermissionMasks) as ProjectRole[]) {
		result[role] = maskToPermissions(rolePermissionMasks[role]);
	}
	return result;
};

export const isCustomPermissionMask = (
	mask: PermissionMask | bigint | number | null | undefined,
	roleMask: PermissionMask | bigint | number | null | undefined
): boolean => toMaskBigInt(mask) !== toMaskBigInt(roleMask);

export function can(
	permissionsOrMask:
		| EffectivePermissions
		| PermissionMask
		| bigint
		| number
		| null
		| undefined,
	domain: PermissionDomain,
	action: PermissionAction
): boolean {
	if (isEffectivePermissions(permissionsOrMask)) {
		return permissionsOrMask[domain][action] === true;
	}
	return hasPerm(permissionsOrMask, domain, action);
}

export function hasReadAccess(
	permissionsOrMask:
		| EffectivePermissions
		| PermissionMask
		| bigint
		| number
		| null
		| undefined
): boolean {
	if (!permissionsOrMask) return false;
	if (isEffectivePermissions(permissionsOrMask)) {
		return Object.values(permissionsOrMask).some(
			(domainPermission: ActionPermission) => domainPermission.view
		);
	}
	return permissionDomains.some((domain) => hasPerm(permissionsOrMask, domain, "view"));
}
