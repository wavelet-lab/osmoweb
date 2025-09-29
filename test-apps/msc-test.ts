import { MscController } from '@osmoweb/backend-core/osmoctrl';

async function testMscController() {
    const msc = new MscController('localhost', 4254, false);

    console.log('🧪 Starting MSC Controller tests...\n');
    try {
        // Test 1: Connect and get stats
        console.log('📊 Getting MSC stats...');
        const stats = await msc.getStats();
        console.log('✅ MSC Stats:', stats);
    } catch (err) {
        console.error('❌ MSC test failed:', err);
        process.exitCode = 1;
    } finally {
        msc.disconnect();
        console.log('🔌 Disconnected from MSC');
    }
}

testMscController()
    .then(() => {
        console.log('\n✅ MSC test completed');
        process.exit(0);
    })
    .catch((e) => {
        console.error('\n❌ MSC test error:', e);
        process.exit(1);
    });