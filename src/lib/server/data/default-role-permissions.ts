import { rolePermissionsToMasks } from "$lib/utils/permission";

export const projectRoleOrder: ProjectRole[] = [
	"Owner",
	"Admin",
	"Editor",
	"Member",
	"Viewer",
	"Limited Access"
];

export const defaultRolePermissionsMatrix: RolePermissionMap = {
	Owner: {
		project: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		story: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		problem: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		idea: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		task: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		page: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		calendar: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		member: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true }
	},
	Admin: {
		project: { view: true, create: false, edit: true, delete: false, archive: true, statusChange: true },
		story: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		problem: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		idea: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		task: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		page: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		calendar: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		member: { view: true, create: true, edit: true, delete: true, archive: false, statusChange: true }
	},
	Editor: {
		project: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		problem: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		idea: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		task: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		page: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		calendar: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		member: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false }
	},
	Member: {
		project: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		problem: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		idea: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		task: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		page: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		calendar: { view: true, create: true, edit: false, delete: false, archive: false, statusChange: false },
		member: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false }
	},
	Viewer: {
		project: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		problem: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		idea: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		task: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		feedback: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		resource: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		page: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		calendar: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		member: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false }
	},
	"Limited Access": {
		project: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		problem: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		idea: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		task: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		feedback: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		resource: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		page: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		calendar: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		member: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false }
	}
};

export const defaultRolePermissionMasks: RolePermissionMaskMap = rolePermissionsToMasks(
	defaultRolePermissionsMatrix
);

export const getDefaultRolePermissionMasks = (): RolePermissionMaskMap =>
	structuredClone(defaultRolePermissionMasks);
