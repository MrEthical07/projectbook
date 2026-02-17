import { getProjectTeamRoles } from "$lib/remote/project.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const teamRoles = await getProjectTeamRoles(params.projectId);
	return {
		members: teamRoles.members,
		rolePermissions: teamRoles.rolePermissions
	};
}
