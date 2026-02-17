import { getProjectTeamMembers } from "$lib/remote/project.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const teamMembers = await getProjectTeamMembers(params.projectId);
	return {
		members: teamMembers.members,
		invites: teamMembers.invites
	};
}
