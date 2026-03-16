const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const deleteRooms = async () => {
    const url = 'https://monopoly-bank-worker.oopsoops-ty.workers.dev/api/rooms';
    const res = await fetch(url);
    const data = await res.json();
    const rooms = data.rooms;
    console.log(`Found ${rooms.length} rooms to delete.`);

    for (const room of rooms) {
        console.log(`Deleting room ${room.code}...`);
        let success = false;
        while (!success) {
            const delRes = await fetch(`${url}/${room.code}`, { method: 'DELETE' });
            console.log(`Response: ${delRes.status}`);
            if (delRes.status === 429) {
                console.log("Rate limited. Waiting 10s...");
                await wait(10000);
            } else {
                success = true;
            }
        }
    }

    console.log('All rooms deleted successfully!');
};

deleteRooms();
