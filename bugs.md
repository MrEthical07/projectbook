1. in all of the index pages, use icons for the stat boxes. 
2. the add section of the stories page has way too much height. max height should be 80vh any greater than that and it must become scrollable. Implement this across web wherever dialog is used, max-h is 80 vh any more thant that and it will go into scroll.
3. i have made some changes to the index page of stories, like table having a parent with rounded border, the full width of the triggers of the filters, text centering in the table, Implement it across all the index pages. 
4. In the sidebar, in submenus for each category like stories etc, we have button called add page but right now its not working, so implement a dialog which will open, user will enter the name of the page, and he will click create button and then it will load for a sec to imitate a server event and then user will be redirected to the created artifact. 
5. in all of the pages: stories, journeys, problem statement, ideas, tasks, feedback, have a icon i clicking on which it will open dialog which will have all the meta data of the artifacts, such as created by, edited by, last edited by, date, etc etc.
6. make the styling across artifacts to be consistent for the header, use the stories and journeys header for reference while making sure that headers are tailored for the artifacts.
7. in the artifact of problem statement, if user selects a user story or journey from the select element then that story/journey should not reappear in the select list. Also the dialog for changing status is not working properly. again the optional modules section here is not consistent with the one in user story so make it consistent.
8. in the ideas artifact as well the optional modules section is not consistent. and the change status dialog is not working, also there is no proper confirmation button or anything in the dialog.
9. in the ideas page the remove button for the optional section appears only when the user is hovering on the module, implement this accross all artifacts and instead of button use the icon that is being used in the stories artifact.
10. the variables which are declared using derived or derived.by or state are variables which can change the value so make sure they are declared with let so that it doesnt result into any weird behavior.
11. also on the pages artifact, allow user editing content of the various content for the views like board, list, calendar, timeline, so basically user adds content to this, when clicked on the content it should open a dialog in which use should be able to edit the content.
12. in the members page, in the pending invites section, have an action as well where there will be option to cancel the invite. 
13. add a activity log page which will have items similar to the recent activity tab in the dashboard page, have filters as well in this page, also when clicked on individual item then a small dialog should open with all the information about that item. And link the dashboard page view all acitivty link to this page and from the project setting as well. the path should be: routes/project/[projectId]/activity/+page.svelte




Task1:
Check for all the possible bugs in the project right now and report them back to me telling me where, why, severity, possible fix

Task2: well fix all of them. Make sure the overall architecture does not change and data flow is steady with all the data coming from remote functions only.


Task3:
Add a superadmin account for the time being and has fixed creds for the acc being admin@projectbook.com and pass being admin.
Also make sure the login is valid for 7 days unless logout.

Now next important is
Check for all the types i.e. make sure the entire project is completely type safe including input handling, Such that no attacks should be possible and also unknown errors shuld not be there due to types.
Also make sure all remote functions are type safe, the ones that handle input are also typed properly and outputs of the functions are also typed properly.


Task4:
1. For user story artifacts:

when we change the artifact page in same domain as in user stories just go from story to another, the url itself changes but the data does not. the page content remains same. the issue might be with the load function which is supposed to load the data.(similar bug in all artifacts as well) its not changing right now. 
when user story is locked it should now allow data change and all inputs must be disabled but right now u can still change the data. same with archived.
the change status should open a dialog and ask for confirmation to change status in user story artifact but right now its not working. 
there should be a changes tracker implemented in the artifacts such that if any changes is made then it should show edited tag but right now its not working. also clicking on the save changes button should trigger a function which saves the changes and creates a toast saying changes saved. right now its not working. 

2. the source insights in problem statement artifacts are not working properly. They must derived the details from all the linked personas and concat them accordingly to show proper results. also the jouney highlight and key observations should be not be there instead the pain point should be there. if story then say pain points, if journey then say joruney pain points wherein each journey pain point is there with the associated journey. similarly the source pain point section also must be as per linked artifacts only.  

3. the link artifacts section in feedback, the select triggers does not have fixed width causing them to take more width resulting into messy layout.



New Bugs:
1. in the ideas artifacts, its still using stale data for link problem statement section.
2. the change status is not working in the ideas page (the selected status). 
3. the  taskboard artifact page is also having stale data. also there is no edited indicator in this page like the ideas artifact page.

4. `getStoryCachedDetail` exported from src/lib/remote/story.remote.ts is invalid — all exports from this file must be remote functions
5. `getJourneyCachedDetail` exported from src/lib/remote/journey.remote.ts is invalid — all exports from this file must be remote functions

6. in all artifacts, in case there is nothing to link then show proper (No Artifact* Available) messsages instead of empty selectables. 
7. in prblem statement artfact, there are some conditions for locking the statement, but as of now they are not proper understandable for UI, so make some indication as cant lock problem statement unless:
8. save changes in ps artifact pages is not working, also not working in other artifacts.. 
9. in the ps artifact page, user is able to select user story/journey even when its locked. this is a bug and user can edit anything once its locked.
10. check for stale data in the dashboard page. There must not be default data in any page and anywhere else which is not part of the default settings



Next Task:
1. the change status is not working in journeys/stories page..
2. Check for the bugs for saving changes AND  change status functionality for all artifact pages.


Fixes Applied (Change Status & Save Changes Audit):
1. [story.remote.ts] Fixed: addOnSections were lost on every save because the templateKeys filter stripped them. Now addOnSections are persisted in the cache alongside normalized story data.
2. [story.remote.ts] Fixed: Status permission check (canChangeStoryStatus) was triggered even on content-only saves because the payload always included the current status. Now only checks permission when status actually changes.
3. [journey.remote.ts] Fixed: Added missing canChangeJourneyStatus permission helper. updateJourney now properly checks statusChange permission when status is being changed (was missing entirely before).
4. [journey.remote.ts] Fixed: Same status-on-save issue as stories - no longer blocks content saves when user has edit but not statusChange permission.
5. [idea.remote.ts] Fixed: Runtime crash - ideasDetailData.problemOptions was referencing an undefined variable. Replaced with direct datastore lookup for locked problems.
6. [task.remote.ts] Fixed: Runtime crash - taskDetailData.ideaOptions was referencing an undefined variable. Replaced with direct datastore lookup for ideas.
7. [feedback/[slug]/+page.svelte] Fixed: confirmOutcomeChange was local-only (no remote call). Now triggers triggerSave() after setting the outcome, persisting the change immediately.
8. [feedback/[slug]/+page.svelte] Fixed: Archive/Unarchive buttons were local-only. Now trigger triggerSave() after toggling isArchived.
9. [feedback/[slug]/+page.svelte] Fixed: Missing toast.error on save failure. Now shows "Failed to save changes" toast.
10. [problem-statement/[slug]/+page.svelte] Fixed: Archive/Unarchive buttons were local-only. Now trigger triggerSave() after toggling status.
11. [ideas/[slug]/+page.svelte] Fixed: Archive/Unarchive buttons were local-only. Now trigger triggerSave() after toggling isArchived.