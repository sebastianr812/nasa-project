const launches = require('./launches.mongo');
const planets = require('./planets.mongo');

const axios = require('axios');

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunchesFromSpaceX() {
    const response = await axios.post(SPACEX_API_URL, {

        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        customers: 1
                    }
                }
            ]
        }
    });

    if (response.status !== 200) {
        console.log('problem downloading launch data');
        throw new Error('launch data download failed (http request failure)')
    }

    const launchDocs = await response.data.docs;

    for (const launchDoc of launchDocs) {
        const payloads = launchDoc.payloads;
        const customers = payloads.flatMap((payload) => {
            return payload.customers;
        });

        const launchObjectForDb = {
            flightNumber: launchDoc.flight_number,
            mission: launchDoc.name,
            rocket: launchDoc.rocket.name,
            launchDate: launchDoc.date_local,
            upcoming: launchDoc.upcoming,
            success: launchDoc.success,
            customers: customers,
        }

        saveLaunch(launchObjectForDb);
    }

}

async function loadLaunchData() {
    console.log('downloading launch data....')

    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat'
    });

    if (firstLaunch) {
        console.log('launch data already loaded');

    } else {
        await populateLaunchesFromSpaceX();
    }

}

async function findLaunch(filter) {
    return await launches.findOne(filter);
}

async function existsLaunchWithId(id) {
    return await findLaunch({
        flightNumber: id,
    });
}

async function getLatestFlightNumber() {
    const latestLaunch = await launches.findOne({}).sort('-flightNumber');

    if (!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
    return await launches.find({}, '-_id -__v')
        .sort({ flightNumber: 1 })
        .skip(skip)
        .limit(limit);
}

async function saveLaunch(launch) {
    await launches.findOneAndUpdate({
        flightNumber: launch.flightNumber,
    }, launch, {
        upsert: true,
    }
    );
}



async function scheduleNewLaunch(launch) {
    const habitablePlanet = await planets.findOne({
        keplerName: launch.target,
    });


    if (!habitablePlanet) {
        throw new Error('No matching planet found');
    }

    const newFlightNumber = await getLatestFlightNumber() + 1;
    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: [
            'Zerto to Mastery',
            'NASA'
        ],
        flightNumber: newFlightNumber,
    });
    await saveLaunch(newLaunch);
}

async function abortLaunchById(id) {
    const aborted = await launches.updateOne({
        flightNumber: id,
    }, {
        upcoming: false,
        success: false,
    });

    return aborted.modifiedCount === 1;

}

module.exports = {
    getAllLaunches,
    existsLaunchWithId,
    abortLaunchById,
    scheduleNewLaunch,
    loadLaunchData
};


