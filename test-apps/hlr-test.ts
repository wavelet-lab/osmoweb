import { HlrController } from '@osmoweb/backend-core/osmoctrl';

async function testHlrController() {
    const hlr = new HlrController('localhost', 4258, false);

    console.log('🧪 Starting HLR Controller tests...\n');

    try {
        // Test 1: Connect and get stats
        console.log('📊 Test 1: Getting HLR stats...');
        const stats = await hlr.getStats();
        console.log('✅ Stats:', stats);

        // Test 2: Get all subscribers
        console.log('\n👥 Test 2: Getting all subscribers...');
        const subscribers = await hlr.getSubscribers();
        console.log('✅ Subscribers:', subscribers);

        // Test 3: Add a test subscriber
        console.log('\n➕ Test 3: Adding test subscriber...');
        const testSubscriber = {
            imsi: '001010000000001',
            msisdn: '1234567890',
            algorithm: 'comp128v1',
            ki: '00112233445566778899AABBCCDDEEFF'
        };

        await hlr.addSubscriber(testSubscriber);
        console.log('✅ Subscriber added successfully');

        // Test 4: Get the specific subscriber
        console.log('\n🔍 Test 4: Getting specific subscriber...');
        const subscriber = await hlr.getSubscriber('001010000000001');
        console.log('✅ Subscriber:', subscriber);

        // Test 5: Update subscriber
        console.log('\n✏️ Test 5: Updating subscriber...');
        await hlr.updateSubscriber('001010000000001', {
            msisdn: '0987654321',
            algorithm: 'comp128v2'
        });
        console.log('✅ Subscriber updated successfully');

        // Test 6: Check if subscriber exists
        console.log('\n❓ Test 6: Checking if subscriber exists...');
        const exists = await hlr.subscriberExists('001010000000001');
        console.log('✅ Subscriber exists:', exists);

        // Test 7: Delete subscriber
        console.log('\n🗑️ Test 7: Deleting subscriber...');
        await hlr.deleteSubscriber('001010000000001');
        console.log('✅ Subscriber deleted successfully');

        // Test 8: Verify deletion
        console.log('\n🔍 Test 8: Verifying deletion...');
        const stillExists = await hlr.subscriberExists('001010000000001');
        console.log('✅ Subscriber still exists:', stillExists);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        hlr.disconnect();
        console.log('\n🔌 Disconnected from HLR');
    }
}

// Run tests
testHlrController()
    .then(() => {
        console.log('\n✅ All tests completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    });