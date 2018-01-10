package mil.dds.anet.search;

import mil.dds.anet.search.mssql.MssqlSearcher;
import mil.dds.anet.search.pg.PostgresqlSearcher;
import mil.dds.anet.search.sqlite.SqliteSearcher;
import mil.dds.anet.utils.DaoUtils;

public abstract class Searcher implements ISearcher {

	private IReportSearcher reportSearcher;
	private IPersonSearcher personSearcher;
	private IOrganizationSearcher orgSearcher;
	private IPositionSearcher positionSearcher;
	private ITaskSearcher taskSearcher;
	private ILocationSearcher locationSearcher;
	private ITagSearcher tagSearcher;

	public static Searcher getSearcher(DaoUtils.DbType dbType) {
		switch (dbType) {
			case MSSQL: return new MssqlSearcher();
			case SQLITE:	 return new SqliteSearcher();
			case POSTGRESQL: return new PostgresqlSearcher();
			default: throw new RuntimeException("No searcher found for " + dbType);
		}
	}

	protected Searcher(IReportSearcher reportSearcher, IPersonSearcher personSearcher, IOrganizationSearcher orgSearcher,
			IPositionSearcher positionSearcher, ITaskSearcher taskSearcher, ILocationSearcher locationSearcher, ITagSearcher tagSearcher) {
		super();
		this.reportSearcher = reportSearcher;
		this.personSearcher = personSearcher;
		this.orgSearcher = orgSearcher;
		this.positionSearcher = positionSearcher;
		this.taskSearcher = taskSearcher;
		this.locationSearcher = locationSearcher;
		this.tagSearcher = tagSearcher;
	}

	@Override
	public IReportSearcher getReportSearcher() {
		return reportSearcher;
	}

	@Override
	public IPersonSearcher getPersonSearcher() {
		return personSearcher;
	}

	@Override
	public IOrganizationSearcher getOrganizationSearcher() {
		return orgSearcher;
	}

	@Override
	public IPositionSearcher getPositionSearcher() {
		return positionSearcher;
	}

	@Override
	public ITaskSearcher getTaskSearcher() {
		return taskSearcher;
	}

	@Override
	public ILocationSearcher getLocationSearcher() {
		return locationSearcher;
	}

	@Override
	public ITagSearcher getTagSearcher() {
		return tagSearcher;
	}
}
