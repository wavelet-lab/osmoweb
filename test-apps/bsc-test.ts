import { BscController } from '@osmoweb/backend-core/osmoctrl';

async function testBscController() {
    const bsc = new BscController('localhost', 4242, false);

    console.log('🧪 Starting BSC Controller tests...\n');
    try {
        // Test 1: Get initial stats
        console.log('📊 Getting BSC stats...');
        const stats1 = await bsc.getStats();
        console.log('✅ BSC Stats (before):', stats1);

        // Test 2: Get all BTSes
        console.log('\n👥 Test 2: Getting all BTSes...');
        const btses = await bsc.getAllBts();
        console.log('✅ BTSes:', JSON.stringify(btses, null, 2));

        // Test 3: Create BTS with basic config
        const testBtsId = btses.length;
        console.log(`\n➕ Test 3: Creating BTS ${testBtsId}...`);
        await bsc.addBts(testBtsId, {
            type: 'osmo-bts',
            description: `Test BTS ${testBtsId} from BSC test app variant 1`,
            band: "GSM900",
            unitId: { site: 1801, bts: testBtsId },
            lac: 1001,
            ci: 0,
            trx: [{ id: 0, arfcn: 92 }],
            gprs: false,
        }, false);
        console.log('✅ BTS created');

        // Test 4: Change BTS with basic config
        console.log(`\n➕ Test 4: Changing BTS ${testBtsId}...`);
        await bsc.updateBts(testBtsId, {
            type: 'osmo-bts',
            description: `Test BTS ${testBtsId} from BSC test app variant 2`,
            band: "DSC1800",
            unitId: { site: 1802, bts: testBtsId },
            lac: 1002,
            ci: 1,
            trx: [{ id: 0, arfcn: 62 }],
            gprs: true,
        }, false);
        console.log('✅ BTS changed');

        // Test 5: Get the specific BTS
        console.log(`\n🔍 Test 5: Getting specific BTS ${testBtsId}...`);
        const bts = await bsc.getBts(testBtsId);
        console.log('✅ BTS:', JSON.stringify(bts, null, 2));

        // Test 5: Delete BTS
        // console.log(`\n🗑️ Deleting BTS ${testBtsId}...`);
        // await bsc.deleteBts(testBtsId, false);
        // console.log('✅ BTS deleted');

        // // Test 6: Get stats after deletion
        // console.log('\n📊 Getting BSC stats after BTS deletion...');
        // const stats3 = await bsc.getStats();
        // console.log('✅ BSC Stats (after delete):', stats3);

    } catch (err) {
        console.error('❌ BSC test failed:', err);
        process.exitCode = 1;
    } finally {
        bsc.disconnect();
        console.log('🔌 Disconnected from BSC');
    }
}

testBscController()
    .then(() => {
        console.log('\n✅ BSC test completed');
        process.exit(0);
    })
    .catch((e) => {
        console.error('\n❌ BSC test error:', e);
        process.exit(1);
    });