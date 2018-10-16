import { simpleScenario } from './Scenario'
import { randomElement } from './simutils'
import Aigle from 'aigle'
import colors from 'colors'
import faker from 'faker'


const simulate = async () => {
    console.log('Sim starting'.green)

    while (true) {
        await Aigle.resolve(simpleScenario.userTypes).each(async userType => {
            await Aigle.delay(1000)
            if (1 / userType.frequency > Math.random()) {
                const user = await userType.userFunction()
                const story = faker.random.arrayElement(simpleScenario.stories)

                if (story.userTypes.includes(userType.name) && ((1 / story.frequency) > Math.random())) {
                    console.log(`${user.name}`.blue + ' is performing ' + `${story.name}`.green  )
                    story.runnable(user)
                }
            }
        })
    }
}

(async () => {
    try {
        await simulate()
    } catch (e) {
        console.error(e)
    }
})()