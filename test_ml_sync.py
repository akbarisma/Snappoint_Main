#!/usr/bin/env python3

import requests
import json

def test_ml_sync():
    base_url = "https://snappoint-web.preview.emergentagent.com"
    session = requests.Session()
    
    # Login first
    print("🔐 Logging in...")
    login_response = session.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@snappoint.com", "password": "admin123"}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    print("✅ Login successful")
    
    # Test ML training data endpoints
    print("\n📊 Testing ML Training Data...")
    
    # Get current ML training data
    ml_data_response = session.get(f"{base_url}/api/ml/training-data")
    if ml_data_response.status_code == 200:
        ml_data = ml_data_response.json()
        print(f"✅ Current ML training data: {len(ml_data)} records")
    else:
        print(f"❌ Failed to get ML training data: {ml_data_response.status_code}")
        return False
    
    # Test sync from transactions
    print("\n🔄 Testing Sync from Transactions...")
    sync_response = session.get(f"{base_url}/api/ml/sync-from-transactions")
    
    if sync_response.status_code == 200:
        sync_result = sync_response.json()
        print(f"✅ Sync successful: {sync_result['message']}")
        print(f"   Total days: {sync_result.get('total_days', 'Unknown')}")
    else:
        print(f"❌ Sync failed: {sync_response.status_code}")
        print(f"   Response: {sync_response.text}")
        return False
    
    # Get ML training data after sync
    ml_data_after = session.get(f"{base_url}/api/ml/training-data")
    if ml_data_after.status_code == 200:
        ml_data_after_json = ml_data_after.json()
        print(f"✅ ML training data after sync: {len(ml_data_after_json)} records")
        
        # Show some sample data
        if ml_data_after_json:
            print("   Sample data:")
            for i, record in enumerate(ml_data_after_json[:3]):
                print(f"   - {record.get('tanggal', 'Unknown')}: {record.get('penjualan', 0)} ({record.get('kategori', 'Unknown')})")
    
    # Test prediction with synced data
    print("\n🔮 Testing Prediction with Synced Data...")
    predict_response = session.post(
        f"{base_url}/api/predict",
        json={"n_days": 5}
    )
    
    if predict_response.status_code == 200:
        prediction = predict_response.json()
        print(f"✅ Prediction successful")
        print(f"   Data source: {prediction.get('data_source', 'Unknown')}")
        print(f"   Data points used: {prediction.get('data_points_used', 0)}")
        print(f"   Predictions generated: {len(prediction.get('predictions', []))}")
        
        ringkasan = prediction.get('ringkasan', {})
        if ringkasan:
            print(f"   Average: {ringkasan.get('rata_rata', 0)}")
            print(f"   Total: {ringkasan.get('total', 0)}")
    else:
        print(f"❌ Prediction failed: {predict_response.status_code}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_ml_sync()
    print(f"\n📊 ML Sync Test: {'✅ PASSED' if success else '❌ FAILED'}")