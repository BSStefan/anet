package mil.dds.anet.beans;

import io.leangen.graphql.annotations.GraphQLArgument;
import io.leangen.graphql.annotations.GraphQLIgnore;
import io.leangen.graphql.annotations.GraphQLQuery;

import java.security.Principal;
import java.util.Objects;
import java.util.Optional;

import org.joda.time.DateTime;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.ReportSearchQuery;
import mil.dds.anet.utils.Utils;
import mil.dds.anet.views.AbstractAnetBean;

public class Person extends AbstractAnetBean implements Principal {

	public static enum PersonStatus { ACTIVE, INACTIVE, NEW_USER }
	public static enum Role { ADVISOR, PRINCIPAL }
	
	private String name;
	private PersonStatus status;
	private Role role;
	private Boolean pendingVerification;
	
	private String emailAddress;
	private String phoneNumber;
	private String gender;
	private String country;
	private DateTime endOfTourDate;
	
	private String rank;
	private String biography;
	private String domainUsername;
		
	private Optional<Position> position;
	
	public Person() { 
		this.pendingVerification = false; //Defaults 
	}
	
	@GraphQLQuery(name="name")
	public String getName() {
		return name;
	}
	
	public void setName(String name) {
		this.name = Utils.trimStringReturnNull(name);
	}
	
	@GraphQLQuery(name="status")
	public PersonStatus getStatus() {
		return status;
	}
	
	public void setStatus(PersonStatus status) {
		this.status = status;
	}
	
	@GraphQLQuery(name="role")
	public Role getRole() {
		return role;
	}

	public void setRole(Role role) {
		this.role = role;
	}

	@GraphQLQuery(name="pendingVerification")
	public Boolean getPendingVerification() {
		return pendingVerification;
	}

	public void setPendingVerification(Boolean pendingVerification) {
		this.pendingVerification = pendingVerification;
	}

	@GraphQLQuery(name="emailAddress")
	public String getEmailAddress() {
		return emailAddress;
	}
	
	public void setEmailAddress(String emailAddress) {
		this.emailAddress = Utils.trimStringReturnNull(emailAddress);
	}
	
	@GraphQLQuery(name="phoneNumber")
	public String getPhoneNumber() {
		return phoneNumber;
	}
	
	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = Utils.trimStringReturnNull(phoneNumber);
	}
	
	@GraphQLQuery(name="gender")
	public String getGender() {
		return gender;
	}

	public void setGender(String gender) {
		this.gender = Utils.trimStringReturnNull(gender);
	}

	@GraphQLQuery(name="country")
	public String getCountry() {
		return country;
	}

	public void setCountry(String country) {
		this.country = Utils.trimStringReturnNull(country);
	}

	@GraphQLQuery(name="endOfTourDate")
	public DateTime getEndOfTourDate() {
		return endOfTourDate;
	}

	public void setEndOfTourDate(DateTime endOfTourDate) {
		this.endOfTourDate = endOfTourDate;
	}

	@GraphQLQuery(name="rank")
	public String getRank() {
		return rank;
	}
	
	public void setRank(String rank) {
		this.rank = Utils.trimStringReturnNull(rank);
	}
	
	@GraphQLQuery(name="biography")
	public String getBiography() {
		return biography;
	}
	
	public void setBiography(String biography) {
		this.biography = Utils.trimStringReturnNull(biography);
	}

	@GraphQLQuery(name="domainUsername")
	public String getDomainUsername() {
		return domainUsername;
	}

	public void setDomainUsername(String domainUsername) {
		this.domainUsername = domainUsername;
	}

	@GraphQLQuery(name="position")
	public Position loadPosition() {
		if (position == null) {
			position = Optional.ofNullable(AnetObjectEngine.getInstance()
					.getPositionDao().getCurrentPositionForPerson(this));
		}
		return position.orElse(null);
	}
	
	@GraphQLIgnore
	public Position getPosition() {
		return (position == null) ? null : position.orElse(null);
	}
	
	public void setPosition(Position position) { 
		if (position != null) { 
			this.position = Optional.of(position);
		}
	}
	
	@GraphQLQuery(name="authoredReports") // TODO: batch load? (used in people/Show.js, admin/MergePeople.js)
	public AnetBeanList<Report> loadAuthoredReports(@GraphQLArgument(name="pageNum") Integer pageNum,
			@GraphQLArgument(name="pageSize") Integer pageSize) {
		ReportSearchQuery query = new ReportSearchQuery();
		query.setPageNum(pageNum);
		query.setPageSize(pageSize);
		query.setAuthorId(id);
		return AnetObjectEngine.getInstance().getReportDao().search(query);
	}
	
	@GraphQLQuery(name="attendedReports") // TODO: batch load? (used in admin/MergePeople.js)
	public AnetBeanList<Report> loadAttendedReports(@GraphQLArgument(name="pageNum") Integer pageNum,
			@GraphQLArgument(name="pageSize") Integer pageSize) {
		ReportSearchQuery query = new ReportSearchQuery();
		query.setPageNum(pageNum);
		query.setPageSize(pageSize);
		query.setAttendeeId(id);
		return AnetObjectEngine.getInstance().getReportDao().search(query);
	}
	
	@Override
	public boolean equals(Object o) { 
		if (o == null || !(o instanceof Person)) {
			return false;
        }
		Person other = (Person) o;
		boolean b = Objects.equals(id, other.getId()) 
			&& Objects.equals(other.getName(), name) 
			&& Objects.equals(other.getStatus(), status) 
			&& Objects.equals(other.getRole(), role) 
			&& Objects.equals(other.getEmailAddress(), emailAddress) 
			&& Objects.equals(other.getPhoneNumber(), phoneNumber) 
			&& Objects.equals(other.getRank(), rank) 
			&& Objects.equals(other.getBiography(), biography) 
			&& Objects.equals(other.getPendingVerification(), pendingVerification) 
			&& (createdAt != null) ? (createdAt.isEqual(other.getCreatedAt())) : (other.getCreatedAt() == null) 
			&& (updatedAt != null) ? (updatedAt.isEqual(other.getUpdatedAt())) : (other.getUpdatedAt() == null);
		return b;
 	}
	
	@Override
	public int hashCode() { 
		return Objects.hash(id, name, status, role, emailAddress,
			phoneNumber, rank, biography, createdAt, updatedAt, pendingVerification);
	}
	
	@Override
	public String toString() { 
		return String.format("[id:%d, name:%s, emailAddress:%s]", id, name, emailAddress);
	}
	
	public static Person createWithId(Integer id) {
		if (id == null) { return null; } 
		Person p = new Person();
		p.setId(id);
		return p;
	}
	
}
