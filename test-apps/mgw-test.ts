import { MgwController } from '@osmoweb/backend-core/osmoctrl';

async function testMgwController() {
    const mgw = new MgwController('localhost', 4243, false);

    console.log('🧪 Starting MGW Controller tests...\n');
    try {
        // Test 1: Connect and get stats
        console.log('📊 Getting MGW stats...');
        const stats = await mgw.getStats();
        console.log('✅ MGW Stats:', stats);
    } catch (err) {
        console.error('❌ MGW test failed:', err);
        process.exitCode = 1;
    } finally {
        mgw.disconnect();
        console.log('🔌 Disconnected from MGW');
    }
}

testMgwController()
    .then(() => {
        console.log('\n✅ MGW test completed');
        process.exit(0);
    })
    .catch((e) => {
        console.error('\n❌ MGW test error:', e);
        process.exit(1);
    });