package mil.dds.anet.emails;

import java.util.HashMap;
import java.util.Map;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.Report;

public class FutureEngagementUpdated extends AnetEmailAction {

	Report report;
	
	public FutureEngagementUpdated() { 
		templateName = "/emails/futureEngagementUpdated.ftl";
		subject = "ANET: Upcoming Engagement Report";
	}
	
	@Override
	public Map<String, Object> execute() {
		Report r = AnetObjectEngine.getInstance().getReportDao().getById(report.getId());
		Map<String,Object> context = new HashMap<String,Object>();
		context.put("report", r);
		return context;
	}

	public Report getReport() {
		return report;
	}

	public void setReport(Report report) {
		this.report = Report.createWithId(report.getId());
	}
	
	

}
