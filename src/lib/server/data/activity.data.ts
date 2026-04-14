import { datastore } from "./datastore";
import { dashboardActivityData } from "./project.data";
import { homeActivityData, homeActivityPageData } from "./home.data";

export const projectActivityData = dashboardActivityData;
export const homeDashboardActivityData = homeActivityData;
export const homeActivityStreamData = homeActivityPageData;

datastore.activity = [...projectActivityData, ...homeActivityStreamData];
