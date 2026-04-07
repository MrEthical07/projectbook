export const permissionDomains = [
	"project",
	"story",
	"problem",
	"idea",
	"task",
	"feedback",
	"resource",
	"page",
	"calendar",
	"member"
] as const satisfies readonly PermissionDomain[];

export const permissionActions = [
	"view",
	"create",
	"edit",
	"delete",
	"archive",
	"statusChange"
] as const satisfies readonly PermissionAction[];

export const permissionActionBitLabels = [
	"view",
	"create",
	"edit",
	"delete",
	"archive",
	"status"
] as const;

export const PERMISSION_BITS_PER_DOMAIN = 6;
export const PERMISSION_BIT_CAP = 64;
export const PERMISSION_BITS_USED = permissionDomains.length * PERMISSION_BITS_PER_DOMAIN;

export const permissionDomainIndex: Record<PermissionDomain, number> = {
	project: 0,
	story: 1,
	problem: 2,
	idea: 3,
	task: 4,
	feedback: 5,
	resource: 6,
	page: 7,
	calendar: 8,
	member: 9
};

export const permissionActionIndex: Record<PermissionAction, number> = {
	view: 0,
	create: 1,
	edit: 2,
	delete: 3,
	archive: 4,
	statusChange: 5
};

export const getPermissionBit = (
	domainIndex: number,
	actionIndex: number
): bigint => {
	const bitIndex = domainIndex * PERMISSION_BITS_PER_DOMAIN + actionIndex;
	if (bitIndex < 0 || bitIndex >= PERMISSION_BIT_CAP) {
		throw new Error(`Permission bit index '${bitIndex}' is out of range.`);
	}
	return 1n << BigInt(bitIndex);
};
