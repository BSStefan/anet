import CreatePerson from '../pages/createNewPerson.page'
import { expect } from 'chai'

const VALID_PERSON_PRINCIPAL = {
        lastName: 'Doe'
    }
const VALID_PERSON_ADVISOR = {
        lastName: 'Roe',
        firstName: 'Jane',
        emailAddress: 'test@NATO.INT'
    }

describe('Create new Person form page', () => {

    describe('When creating a Principle user', () => {
        it('Should save a principle with only a last name', () => {
            CreatePerson.openAsSuperUser()
            CreatePerson.form.waitForExist()
            CreatePerson.form.waitForVisible()
            CreatePerson.lastName.setValue(VALID_PERSON_PRINCIPAL.lastName)
            CreatePerson.submitForm()
            CreatePerson.waitForAlertSuccessToLoad()
            const alertMessage = CreatePerson.alertSuccess.getText()
            expect(alertMessage).to.equal('Person saved successfully')
        })
        it('Should not save a principle without a valid email address', () => {
            CreatePerson.openAsSuperUser()
            CreatePerson.form.waitForExist()
            CreatePerson.form.waitForVisible()
            CreatePerson.lastName.setValue(VALID_PERSON_PRINCIPAL.lastName)
            CreatePerson.emailAddress.setValue('notValidEmail@')
            CreatePerson.submitForm()
            const errorMessage = browser.element('input#emailAddress + span.help-block')
            errorMessage.waitForExist()
            errorMessage.waitForVisible()
            expect(errorMessage.getText()).to.equal('Valid email address is required')

            // perform submit form to prevent warning dialog
            CreatePerson.emailAddress.clearElement()
            CreatePerson.lastName.click()
            CreatePerson.submitForm()
            CreatePerson.waitForAlertSuccessToLoad()
            const alertMessage = CreatePerson.alertSuccess.getText()
            expect(alertMessage).to.equal('Person saved successfully')
        })
    })

    describe('When creating an Advisor user', () => {
        it('Should display a warning message specific for duplicate accounts', () => {
            // Only admin users can create an advisor user
            CreatePerson.openAsAdmin()
            CreatePerson.form.waitForExist()
            CreatePerson.form.waitForVisible()
            CreatePerson.roleAdvisorButton.waitForExist()
            CreatePerson.roleAdvisorButton.click()
            const warningMessage = browser.element('.alert.alert-warning')
            warningMessage.waitForExist()
            warningMessage.waitForVisible()
            expect(warningMessage.getText()).to.equal('Creating a NATO Member in ANET could result in duplicate accounts if this person logs in later. If you notice duplicate accounts, please contact an ANET administrator.')
        })
        it('Should save with a valid email address in uppercase', () => {
            // Continue on the same page to prevent "Are you sure you wish to navigate away from the page" warning
            CreatePerson.lastName.setValue(VALID_PERSON_ADVISOR.lastName)
            CreatePerson.firstName.setValue(VALID_PERSON_ADVISOR.firstName)
            CreatePerson.roleAdvisorButton.waitForExist()
            CreatePerson.roleAdvisorButton.click()
            CreatePerson.emailAddress.setValue(VALID_PERSON_ADVISOR.emailAddress)
            const errorMessage = browser.element('input#emailAddress + span.help-block')
            errorMessage.waitForVisible(1000, true) // element should *not* be visible!
            CreatePerson.rank.selectByValue(CreatePerson.getRandomOption(CreatePerson.rank))
            CreatePerson.gender.selectByValue(CreatePerson.getRandomOption(CreatePerson.gender))
            CreatePerson.country.selectByValue(CreatePerson.getRandomOption(CreatePerson.country))
            CreatePerson.submitForm()
            CreatePerson.waitForAlertSuccessToLoad()
            const alertMessage = CreatePerson.alertSuccess.getText()
            expect(alertMessage).to.equal('Person saved successfully')
        })
    })
})
