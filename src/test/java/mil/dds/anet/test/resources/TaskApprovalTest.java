package mil.dds.anet.test.resources;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

import com.fasterxml.jackson.core.type.TypeReference;
import com.google.common.collect.Lists;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Optional;
import javax.ws.rs.BadRequestException;
import javax.ws.rs.ForbiddenException;
import mil.dds.anet.beans.ApprovalStep;
import mil.dds.anet.beans.ApprovalStep.ApprovalStepType;
import mil.dds.anet.beans.Location;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.Report;
import mil.dds.anet.beans.Report.Atmosphere;
import mil.dds.anet.beans.Report.ReportState;
import mil.dds.anet.beans.ReportAction;
import mil.dds.anet.beans.ReportPerson;
import mil.dds.anet.beans.Task;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.PersonSearchQuery;
import mil.dds.anet.beans.search.ReportSearchQuery;
import mil.dds.anet.test.beans.PersonTest;
import mil.dds.anet.test.resources.utils.GraphQlResponse;
import org.junit.jupiter.api.Test;

public class TaskApprovalTest extends AbstractResourceTest {

  private static final String ORGANIZATION_FIELDS =
      "uuid shortName longName status identificationCode type";
  private static final String POSITION_FIELDS =
      "uuid name code type status organization { " + ORGANIZATION_FIELDS + " }";
  private static final String PERSON_FIELDS =
      "uuid name status role rank domainUsername position { " + POSITION_FIELDS + " }";
  private static final String APPROVAL_STEP_FIELDS =
      "uuid name restrictedApproval relatedObjectUuid nextStepUuid approvers"
          + " { uuid name person { uuid name rank role } }";
  private static final String REPORT_FIELDS =
      "uuid state workflow { type createdAt person { uuid } step { " + APPROVAL_STEP_FIELDS
          + " } }";
  private static final String TASK_FIELDS = "uuid shortName longName status taskedOrganizations"
      + " { uuid shortName longName identificationCode } planningApprovalSteps { "
      + APPROVAL_STEP_FIELDS + " } approvalSteps { " + APPROVAL_STEP_FIELDS + " }";

  // Test report approval scenarios for tasks mostly use the following data:
  // - report task 2.A (which has tasked org EF 2)
  // - task 2.A has approver for planning OF-9 JACKSON, Jack (from org EF 2.1)
  // - task 2.A has approver for publication BGen HENDERSON, Henry (from org EF 2.1)
  // - report primary advisor CIV REINTON, Reina (from org EF 2.2)

  // Task 2.A
  private static final String TEST_TASK_UUID = "75d4009d-7c79-42e0-aa2f-d79d158ec8d6";
  // Location Fort Amherst
  private static final String TEST_LOCATION_UUID = "c7a9f420-457a-490c-a810-b504c022cf1e";

  // submitted report, no approval step for effort
  // => there should be no approval step for the effort on the report workflow
  @Test
  public void testNoSteps() {
    final Task task = clearTaskApprovalSteps(TEST_TASK_UUID);

    final Report report = submitReport("testNoSteps", getPersonFromDb("ERINSON, Erin"), task, false,
        ReportState.PENDING_APPROVAL);
    assertWorkflowSize(report, task.getUuid(), 0);
  }

  // submitted report, unrestricted approval step for effort has matching org
  // => there should be an approval step for the effort
  // => approver should see the report as pending approval
  // => approver should be able to approve the report
  @Test
  public void testUnrestrictedStepMatchingOrgReportPublication() {
    testUnrestrictedStepMatchingOrg("testUnrestrictedStepMatchingOrgReportPublication", false);
  }

  @Test
  public void testUnrestrictedStepMatchingOrgPlannedEngagement() {
    testUnrestrictedStepMatchingOrg("testUnrestrictedStepMatchingOrgPlannedEngagement", true);
  }

  private void testUnrestrictedStepMatchingOrg(String text, boolean isPlanned) {
    final Task task = clearTaskApprovalSteps(TEST_TASK_UUID);

    final Person approver = getApprover(isPlanned);
    final Task updatedTask = updateTaskApprovalSteps(task, approver, isPlanned, false);

    final Report report = submitReport(text, getPersonFromDb("ERINSON, Erin"), updatedTask,
        isPlanned, ReportState.PENDING_APPROVAL);
    assertWorkflowSize(report, updatedTask.getUuid(), 1);

    // Go through organization approval first
    organizationalApproval(report, isPlanned);

    // Check reports pending approval
    checkPendingApproval(approver, report, 1);

    // Approve the report
    approveReport(report, approver, false);
  }

  // submitted report, unrestricted approval step for effort has no matching org
  // => there should be an approval step for the effort
  // => approver should see the report as pending approval
  // => approver should be able to approve the report
  @Test
  public void testUnrestrictedStepNoMatchingOrgReportPublication() {
    testUnrestrictedStepNoMatchingOrg("testUnrestrictedStepNoMatchingOrgReportPublication", false);
  }

  @Test
  public void testUnrestrictedStepNoMatchingOrgPlannedEngagement() {
    testUnrestrictedStepNoMatchingOrg("testUnrestrictedStepNoMatchingOrgPlannedEngagement", true);
  }

  private void testUnrestrictedStepNoMatchingOrg(String text, boolean isPlanned) {
    final Task task = clearTaskApprovalSteps(TEST_TASK_UUID);

    // Someone from EF 1.1
    final Person approver = getPersonFromDb("ELIZAWELL, Elizabeth");
    final Task updatedTask = updateTaskApprovalSteps(task, approver, isPlanned, false);

    final Report report = submitReport(text, getPersonFromDb("ERINSON, Erin"), updatedTask,
        isPlanned, ReportState.PENDING_APPROVAL);
    assertWorkflowSize(report, updatedTask.getUuid(), 1);

    // Go through organization approval first
    organizationalApproval(report, isPlanned);

    // Check reports pending approval
    checkPendingApproval(approver, report, 1);

    // Approve the report
    approveReport(report, approver, false);
  }

  // submitted report, restricted approval step for effort has no matching org
  // => there should be no approval step for the effort
  // => approver should not see the report as pending approval
  // => approver should not be able to approve the report
  @Test
  public void testRestrictedStepNoMatchingOrgReportPublication() {
    testRestrictedStepNoMatchingOrg("testRestrictedStepNoMatchingOrgReportPublication", false);
  }

  @Test
  public void testRestrictedStepNoMatchingOrgPlannedEngagement() {
    testRestrictedStepNoMatchingOrg("testRestrictedStepNoMatchingOrgPlannedEngagement", true);
  }

  private void testRestrictedStepNoMatchingOrg(String text, boolean isPlanned) {
    final Task task = clearTaskApprovalSteps(TEST_TASK_UUID);

    // Someone from EF 1.1
    final Person approver = getPersonFromDb("ELIZAWELL, Elizabeth");
    final Task updatedTask = updateTaskApprovalSteps(task, approver, isPlanned, true);

    final Person author = getPersonFromDb("ERINSON, Erin");
    final Report report = submitReport(text, author, updatedTask, isPlanned,
        isPlanned ? ReportState.APPROVED : ReportState.PENDING_APPROVAL);
    assertWorkflowSize(report, updatedTask.getUuid(), 0);

    // Go through organization approval first
    organizationalApproval(report, isPlanned);

    // Check reports pending approval
    checkPendingApproval(approver, report, 0);

    // Try to approve the report
    approveReport(report, approver, true);

    // Delete the report
    deleteReport(author, report);
  }

  // submitted report, restricted approval step for effort has matching org
  // => there should be an approval step for the effort
  // => approver should see the report as pending approval
  // => approver should be able to approve the report
  @Test
  public void testRestrictedStepMatchingOrgReportPublication() {
    testRestrictedStepMatchingOrg("testRestrictedStepMatchingOrgReportPublication", false);
  }

  @Test
  public void testRestrictedStepMatchingOrgPlannedEngagement() {
    testRestrictedStepMatchingOrg("testRestrictedStepMatchingOrgPlannedEngagement", true);
  }

  private void testRestrictedStepMatchingOrg(String text, boolean isPlanned) {
    final Task task = clearTaskApprovalSteps(TEST_TASK_UUID);

    final Person approver = getApprover(isPlanned);
    final Task updatedTask = updateTaskApprovalSteps(task, approver, isPlanned, true);

    final Report report = submitReport(text, getPersonFromDb("ERINSON, Erin"), updatedTask,
        isPlanned, ReportState.PENDING_APPROVAL);
    assertWorkflowSize(report, updatedTask.getUuid(), 1);

    // Go through organization approval first
    organizationalApproval(report, isPlanned);

    // Check reports pending approval
    checkPendingApproval(approver, report, 1);

    // Approve the report
    approveReport(report, approver, false);
  }

  // submitted report, restricted approval step for effort has matching org,
  // but then task is edited to remove approver from matching org
  // => first, there should be an approval step for the effort,
  // after the edit the step should still be there but have no approvers
  // => first, approver should see the report as pending approval,
  // after the edit approver should not see the report as pending approval
  // and approver should not be able to approve the report
  @Test
  public void testRestrictedStepEditedMatchingOrgReportPublication() {
    testRestrictedStepEditedMatchingOrg("testRestrictedStepEditedMatchingOrgReportPublication",
        false);
  }

  @Test
  public void testRestrictedStepEditedMatchingOrgPlannedEngagement() {
    testRestrictedStepEditedMatchingOrg("testRestrictedStepEditedMatchingOrgPlannedEngagement",
        true);
  }

  private void testRestrictedStepEditedMatchingOrg(String text, boolean isPlanned) {
    final Task task = clearTaskApprovalSteps(TEST_TASK_UUID);

    final Person approver = getApprover(isPlanned);
    final Task updatedTask = updateTaskApprovalSteps(task, approver, isPlanned, true);

    final Person author = getPersonFromDb("ERINSON, Erin");
    final Report report =
        submitReport(text, author, updatedTask, isPlanned, ReportState.PENDING_APPROVAL);
    assertWorkflowSize(report, updatedTask.getUuid(), 1);

    // Go through organization approval first
    organizationalApproval(report, isPlanned);

    // Check reports pending approval
    checkPendingApproval(approver, report, 1);

    // Replace the approver from the approval step
    final Task replacedTask = replaceApproversFromTaskApprovalSteps(updatedTask,
        getPersonFromDb("ELIZAWELL, Elizabeth"), isPlanned);

    // Check that approval step has no approvers
    final Report report2 = getReport(author, report);
    assertWorkflowSize(report2, replacedTask.getUuid(), 1);
    final Optional<ReportAction> taskStep =
        report2.getWorkflow().stream().filter(wfs -> wfs.getStep() != null
            && replacedTask.getUuid().equals(wfs.getStep().getRelatedObjectUuid())).findFirst();
    assertThat(taskStep).isPresent();
    assertThat(taskStep.get().getStep().getApprovers()).isEmpty();

    // Check reports pending approval
    checkPendingApproval(approver, report2, 0);

    // Try to approve the report
    approveReport(report2, approver, true);

    // Delete the report
    deleteReport(author, report2);
  }

  // Helper methods below

  private Task clearTaskApprovalSteps(String uuid) {
    final Task task = getTaskFromDb(uuid);
    task.setPlanningApprovalSteps(Collections.emptyList());
    task.setApprovalSteps(Collections.emptyList());
    updateTask(task);
    return task;
  }

  private Task updateTaskApprovalSteps(Task task, Person approver, boolean isPlanned,
      boolean restrictedApproval) {
    final ApprovalStep as = new ApprovalStep();
    as.setName("Task approval by " + approver.getName());
    as.setType(isPlanned ? ApprovalStepType.PLANNING_APPROVAL : ApprovalStepType.REPORT_APPROVAL);
    as.setRestrictedApproval(restrictedApproval);
    final Person unrelatedApprover = getPersonFromDb("ANDERSON, Andrew");
    as.setApprovers(Lists.newArrayList(approver.getPosition(), unrelatedApprover.getPosition()));
    if (isPlanned) {
      task.setPlanningApprovalSteps(Lists.newArrayList(as));
    } else {
      task.setApprovalSteps(Lists.newArrayList(as));
    }
    return updateTask(task);
  }

  private Person getApprover(boolean isPlanned) {
    // Both from EF 2.1
    return getPersonFromDb(isPlanned ? "JACKSON, Jack" : "HENDERSON, Henry");
  }

  private Task replaceApproversFromTaskApprovalSteps(Task task, Person approver,
      boolean isPlanned) {
    if (isPlanned) {
      task.getPlanningApprovalSteps().get(0)
          .setApprovers(Lists.newArrayList(approver.getPosition()));
    } else {
      task.getApprovalSteps().get(0).setApprovers(Lists.newArrayList(approver.getPosition()));
    }
    return updateTask(task);
  }

  private Task updateTask(Task task) {
    final Integer nrUpdated =
        graphQLHelper.updateObject(admin, "updateTask", "task", "TaskInput", task);
    assertThat(nrUpdated).isEqualTo(1);
    return getTaskFromDb(task.getUuid());
  }

  private void organizationalApproval(Report report, boolean isPlanned) {
    // No organizational workflow for planned engagements
    if (!isPlanned) {
      approveReport(report, getPersonFromDb("JACOBSON, Jacob"), false);
      approveReport(report, getPersonFromDb("BECCABON, Rebecca"), false);
    }
  }

  private void approveReport(Report report, Person person, boolean shouldFail) {
    try {
      final Report approved =
          graphQLHelper.updateObject(person, "approveReport", "uuid", REPORT_FIELDS, "String",
              report.getUuid(), new TypeReference<GraphQlResponse<Report>>() {});
      if (shouldFail) {
        fail("Expected an exception");
      }
      assertThat(approved).isNotNull();
    } catch (BadRequestException | ForbiddenException e) {
      if (!shouldFail) {
        fail("Unexpected exception");
      }
    }
  }

  private void checkPendingApproval(Person approver, Report report, int size) {
    final ReportSearchQuery pendingQuery = new ReportSearchQuery();
    pendingQuery.setPendingApprovalOf(approver.getUuid());
    final AnetBeanList<Report> pendingApproval = graphQLHelper.searchObjects(approver, "reportList",
        "query", "ReportSearchQueryInput", REPORT_FIELDS, pendingQuery,
        new TypeReference<GraphQlResponse<AnetBeanList<Report>>>() {});
    assertThat(pendingApproval.getList()).filteredOn(rpt -> rpt.getUuid().equals(report.getUuid()))
        .hasSize(size);
  }

  private Report submitReport(String text, Person author, Task task, boolean isPlanned,
      ReportState expectedState) {
    final Report r = new Report();
    r.setAuthor(author);
    final Instant engagementDate = Instant.now().plus(isPlanned ? 14 : -14, ChronoUnit.DAYS);
    r.setEngagementDate(engagementDate);
    r.setDuration(120);
    final Person reina = getPersonFromDb("REINTON, Reina");
    final Person steve = getPersonFromDb("STEVESON, Steve");
    final ReportPerson advisor = PersonTest.personToReportPerson(reina);
    advisor.setPrimary(true);
    final ReportPerson principal = PersonTest.personToReportPerson(steve);
    principal.setPrimary(true);
    r.setAttendees(Lists.newArrayList(advisor, principal));
    r.setTasks(Lists.newArrayList(task));
    final Location testLocation = new Location();
    testLocation.setUuid(TEST_LOCATION_UUID);
    r.setLocation(testLocation);
    r.setAtmosphere(Atmosphere.POSITIVE);
    final String testText = String.format("Test report for task approval workflow — %1$s", text);
    r.setIntent(testText);
    r.setReportText(testText);
    r.setNextSteps(testText);
    r.setKeyOutcomes(testText);

    // Create the report
    final String createdUuid = graphQLHelper.createObject(author, "createReport", "report",
        "ReportInput", r, new TypeReference<GraphQlResponse<Report>>() {});
    assertThat(createdUuid).isNotNull();

    // Retrieve the created report
    final Report created =
        graphQLHelper.getObjectById(author, "report", "uuid state advisorOrg { uuid }", createdUuid,
            new TypeReference<GraphQlResponse<Report>>() {});
    assertThat(created.getUuid()).isNotNull();
    assertThat(created.getState()).isEqualTo(ReportState.DRAFT);
    assertThat(created.getAdvisorOrgUuid()).isEqualTo(reina.getPosition().getOrganizationUuid());

    // Have the author submit the report
    final Report submitted = graphQLHelper.updateObject(author, "submitReport", "uuid", "uuid",
        "String", created.getUuid(), new TypeReference<GraphQlResponse<Report>>() {});
    assertThat(submitted).isNotNull();
    assertThat(submitted.getUuid()).isEqualTo(created.getUuid());

    // Retrieve the submitted report
    final Report returned = getReport(author, submitted);
    assertThat(returned.getUuid()).isEqualTo(submitted.getUuid());
    assertThat(returned.getState()).isEqualTo(expectedState);

    return returned;
  }

  private Report getReport(Person author, final Report report) {
    final Report returned = graphQLHelper.getObjectById(author, "report", REPORT_FIELDS,
        report.getUuid(), new TypeReference<GraphQlResponse<Report>>() {});
    assertThat(returned).isNotNull();
    return returned;
  }

  private void deleteReport(Person author, Report report) {
    final Report updated = graphQLHelper.updateObject(author, "updateReport", "report",
        REPORT_FIELDS, "ReportInput", report, new TypeReference<GraphQlResponse<Report>>() {});
    assertThat(updated).isNotNull();
    assertThat(updated.getState()).isEqualTo(ReportState.DRAFT);
    graphQLHelper.deleteObject(author, "deleteReport", report.getUuid());
  }

  private void assertWorkflowSize(Report report, String taskUuid, int size) {
    assertThat(report.getWorkflow()).isNotNull();
    assertThat(report.getWorkflow())
        .filteredOn(
            wfs -> wfs.getStep() != null && taskUuid.equals(wfs.getStep().getRelatedObjectUuid()))
        .hasSize(size);
  }

  private Person getPersonFromDb(String name) {
    final PersonSearchQuery personQuery = new PersonSearchQuery();
    personQuery.setText(name);
    final AnetBeanList<Person> searchResults = graphQLHelper.searchObjects(admin, "personList",
        "query", "PersonSearchQueryInput", PERSON_FIELDS, personQuery,
        new TypeReference<GraphQlResponse<AnetBeanList<Person>>>() {});
    assertThat(searchResults.getTotalCount()).isGreaterThan(0);
    final Optional<Person> personResult =
        searchResults.getList().stream().filter(p -> p.getName().equals(name)).findFirst();
    assertThat(personResult).isNotEmpty();
    return personResult.get();
  }

  private Task getTaskFromDb(String uuid) {
    final Task task = graphQLHelper.getObjectById(admin, "task", TASK_FIELDS, uuid,
        new TypeReference<GraphQlResponse<Task>>() {});
    assertThat(task).isNotNull();
    assertThat(task.getUuid()).isEqualTo(uuid);
    return task;
  }

}
