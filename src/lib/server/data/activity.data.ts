import { datastore } from "./datastore";
import { dashboardActivityData } from "./project.data";
import { workspaceActivityData, workspaceActivityPageData } from "./workspace.data";

export const projectActivityData = dashboardActivityData;
export const workspaceDashboardActivityData = workspaceActivityData;
export const workspaceActivityStreamData = workspaceActivityPageData;

datastore.activity = [...projectActivityData, ...workspaceActivityStreamData];
