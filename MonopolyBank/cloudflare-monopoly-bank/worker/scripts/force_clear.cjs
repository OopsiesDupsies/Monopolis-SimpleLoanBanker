const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const deleteRooms = async () => {
    // We can't access DO state directly from here, but we can write a tiny endpoint to delete them
    // Wait, let's just use the existing API but we need the raw room codes

    // Quick script to fetch from the local worker
    const REGISTRY_URL = 'https://monopoly-bank-worker.oopsoops-ty.workers.dev/api/rooms';

    // Instead of doing it from Node, let me just add a secret endpoint to the worker to wipe the registry
    console.log('Use worker endpoint instead');
};

deleteRooms();
