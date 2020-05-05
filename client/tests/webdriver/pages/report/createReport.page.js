import moment from "moment"
import Page from "../page"

const PAGE_URL = "/reports/new"

class CreateReport extends Page {
  get form() {
    return browser.$("form")
  }

  get title() {
    return browser.$("h2.legend")
  }

  get intent() {
    return browser.$("#intent")
  }

  get engagementDate() {
    return browser.$("#engagementDate")
  }

  get today() {
    return browser.$(".bp3-datepicker-footer > button:first-child")
  }

  get hour() {
    return browser.$("input.bp3-timepicker-input.bp3-timepicker-hour")
  }

  get minute() {
    return browser.$("input.bp3-timepicker-input.bp3-timepicker-minute")
  }

  get duration() {
    return browser.$("#duration")
  }

  get attendees() {
    return browser.$("#attendees")
  }

  get attendeesTable() {
    return browser.$("#attendees-popover .table-responsive table")
  }

  get submitButton() {
    return browser.$("#formBottomSubmit")
  }

  open() {
    super.open(PAGE_URL)
  }

  getAdvisor(index) {
    const advisor = browser.$(
      `.advisorAttendeesTable tbody tr:nth-child(${index})`
    )

    // wait for conflict loader to disappear
    advisor.$("td:nth-child(6) div.bp3-spinner").waitForExist({ reverse: true })

    return {
      name: advisor.$("td:nth-child(2)").getText(),
      conflictButton: advisor.$("td:nth-child(6) > span"),
      deleteButton: advisor.$("td:nth-child(7) > button")
    }
  }

  getPrincipal(index) {
    // principals table has an empty row at top
    const principal = browser.$(
      `.principalAttendeesTable tbody tr:nth-child(${index + 1})`
    )

    // wait for conflict loader to disappear
    principal
      .$("td:nth-child(6) div.bp3-spinner")
      .waitForExist({ reverse: true })

    return {
      name: principal.$("td:nth-child(2)").getText(),
      conflictButton: principal.$("td:nth-child(6) > span"),
      deleteButton: principal.$("td:nth-child(7) > button")
    }
  }

  selectAttendeeByName(name) {
    this.attendees.click()
    // wait for attendess table loader to disappear
    this.attendeesTable.waitForDisplayed()
    let searchTerm = name
    if (searchTerm.startsWith("CIV") || searchTerm.startsWith("Maj")) {
      searchTerm = name.substr(name.indexOf(" ") + 1)
    }
    browser.keys(searchTerm)
    this.attendeesTable.waitForDisplayed()
    const checkBox = this.attendeesTable.$(
      "tbody tr:first-child td:first-child input.checkbox"
    )
    if (!checkBox.isSelected()) {
      checkBox.click()
    }
    this.title.click()
    this.attendeesTable.waitForDisplayed({ reverse: true })
  }

  fillForm(fields) {
    this.form.waitForClickable()

    if (fields.intent !== undefined) {
      this.intent.setValue(fields.intent)
    }

    if (moment.isMoment(fields.engagementDate)) {
      this.engagementDate.click()
      this.today.waitForDisplayed()
      this.today.waitForClickable()
      this.today.click()
      this.engagementDate.click()

      this.hour.waitForDisplayed()
      this.hour.waitForClickable()
      this.hour.click()
      browser.keys(fields.engagementDate.format("HH"))

      this.minute.waitForDisplayed()
      this.minute.waitForClickable()
      this.minute.click()
      browser.keys(fields.engagementDate.format("mm"))
      this.engagementDate.click()

      this.title.click()
      this.today.waitForDisplayed({ reverse: true })
    }

    if (fields.duration !== undefined) {
      this.duration.setValue(fields.duration)
    }

    if (Array.isArray(fields.advisors) && fields.advisors.length) {
      fields.advisors.forEach(at => this.selectAttendeeByName(at))
    }

    if (Array.isArray(fields.principals) && fields.principals.length) {
      fields.principals.forEach(at => this.selectAttendeeByName(at))
    }
  }

  submitForm() {
    this.submitButton.click()
  }
}

export default new CreateReport()