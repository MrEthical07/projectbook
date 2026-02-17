
export function can(
	permissions: EffectivePermissions | undefined | null,
	domain: PermissionDomain,
	action: PermissionAction
): boolean {
	return permissions?.[domain]?.[action] === true;
}

export function hasReadAccess(
	permissions: EffectivePermissions | undefined | null
): boolean {
	if (!permissions) return false;
	return Object.values(permissions).some(
		(domainPermission: ActionPermission) => domainPermission.view
	);
}
