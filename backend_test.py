import requests
import sys
import json
from datetime import datetime

class SnapPointAPITester:
    def __init__(self, base_url="https://snappoint-web.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()  # Use session to handle cookies
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_flow(self):
        """Test authentication flow"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test login with admin credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@snappoint.com", "password": "admin123"}
        )
        
        if success and 'id' in response:
            print(f"   Logged in as: {response.get('name', 'Unknown')} ({response.get('role', 'Unknown')})")
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            print(f"   User: {response.get('name', 'Unknown')} - {response.get('email', 'Unknown')}")
        return success

    def test_kategori(self):
        """Test kategori endpoints"""
        print("\n=== KATEGORI TESTS ===")
        success, response = self.run_test("Get Kategoris", "GET", "kategori", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} categories")
            for kat in response[:3]:  # Show first 3
                print(f"   - {kat.get('nama_kategori', 'Unknown')} ({kat.get('jenis', 'Unknown')})")
        return success

    def test_transaksi_flow(self):
        """Test transaction CRUD operations"""
        print("\n=== TRANSAKSI TESTS ===")
        
        # Get existing transactions
        success, transactions = self.run_test("Get Transactions", "GET", "transaksi", 200)
        if success:
            print(f"   Found {len(transactions)} existing transactions")

        # Create income transaction
        income_data = {
            "tanggal": "2026-01-20",
            "kategori": "Pendapatan (Gross Income)",
            "jenis": "PEMASUKAN",
            "keterangan": "Test Income Transaction",
            "nominal": 1000000
        }
        success, response = self.run_test("Create Income Transaction", "POST", "transaksi", 200, income_data)
        income_id = response.get('id') if success else None

        # Create expense transaction
        expense_data = {
            "tanggal": "2026-01-20",
            "kategori": "Operasional & Konsumsi",
            "jenis": "PENGELUARAN",
            "keterangan": "Test Expense Transaction",
            "nominal": 250000
        }
        success, response = self.run_test("Create Expense Transaction", "POST", "transaksi", 200, expense_data)
        expense_id = response.get('id') if success else None

        return income_id, expense_id

    def test_stok_flow(self):
        """Test stock management"""
        print("\n=== STOK TESTS ===")
        
        # Get current stock
        success, response = self.run_test("Get Stock Records", "GET", "stok", 200)
        if success:
            print(f"   Found {len(response)} stock records")

        # Get remaining stock
        success, response = self.run_test("Get Remaining Stock", "GET", "stok/sisa", 200)
        if success:
            print(f"   Remaining stock: {response.get('sisa_stok', 0)} sheets")

        # Add stock movement
        stock_data = {
            "jenis_pergerakan": "MASUK",
            "jumlah_lembar": 500,
            "keterangan": "Test stock addition"
        }
        success, response = self.run_test("Add Stock Movement", "POST", "stok", 200, stock_data)
        return response.get('id') if success else None

    def test_kas_flow(self):
        """Test kas (cash book) management"""
        print("\n=== KAS TESTS ===")
        
        # Get kas records
        success, response = self.run_test("Get Kas Records", "GET", "kas", 200)
        if success:
            print(f"   Found {len(response)} kas records")

        # Get kas settings
        success, response = self.run_test("Get Kas Settings", "GET", "kas/setting", 200)
        if success:
            print(f"   Found {len(response)} kas settings")

        # Create kas record
        kas_data = {
            "keterangan": "Test kas withdrawal",
            "nominal": 100000,
            "is_backdated": False
        }
        success, response = self.run_test("Create Kas Record", "POST", "kas", 200, kas_data)
        return response.get('id') if success else None

    def test_investor_flow(self):
        """Test investor management"""
        print("\n=== INVESTOR TESTS ===")
        
        # Get investors
        success, response = self.run_test("Get Investors", "GET", "investor", 200)
        if success:
            print(f"   Found {len(response)} investors")

        # Create investor
        investor_data = {
            "nama_investor": "Test Investor",
            "persentase": 15.0,
            "mulai_bulan": 1,
            "mulai_tahun": 2026
        }
        success, response = self.run_test("Create Investor", "POST", "investor", 200, investor_data)
        return response.get('id') if success else None

    def test_dashboard_endpoints(self):
        """Test dashboard data endpoints"""
        print("\n=== DASHBOARD TESTS ===")
        
        # Get monthly recap
        success, response = self.run_test("Get Monthly Recap", "GET", "dashboard/rekap", 200)
        if success:
            print(f"   Found {len(response)} monthly records")
            if response:
                latest = response[0]
                print(f"   Latest: {latest.get('tahun', 'Unknown')}-{latest.get('bulan', 'Unknown')} - Laba: {latest.get('laba_bersih', 0)}")

        # Get monthly stock data
        success, response = self.run_test("Get Monthly Stock Data", "GET", "dashboard/stok-bulanan", 200)
        if success:
            print(f"   Found {len(response)} monthly stock records")

    def test_prediction_flow(self):
        """Test ML prediction endpoints"""
        print("\n=== PREDICTION TESTS ===")
        
        # Generate prediction
        predict_data = {"n_days": 7}
        success, response = self.run_test("Generate Prediction", "POST", "predict", 200, predict_data)
        if success:
            predictions = response.get('predictions', [])
            ringkasan = response.get('ringkasan', {})
            print(f"   Generated {len(predictions)} predictions")
            print(f"   Average: {ringkasan.get('rata_rata', 0)}")
            print(f"   Total: {ringkasan.get('total', 0)}")

        # Get prediction history
        success, response = self.run_test("Get Prediction History", "GET", "predict/history", 200)
        if success:
            print(f"   Found {len(response)} prediction history records")

    def test_user_management(self):
        """Test user management (admin only)"""
        print("\n=== USER MANAGEMENT TESTS ===")
        
        # Get users
        success, response = self.run_test("Get Users", "GET", "users", 200)
        if success:
            print(f"   Found {len(response)} users")
            for user in response[:3]:  # Show first 3
                print(f"   - {user.get('name', 'Unknown')} ({user.get('role', 'Unknown')})")

        # Create test user
        user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "name": "Test User",
            "role": "kasir"
        }
        success, response = self.run_test("Create User", "POST", "users", 200, user_data)
        return response.get('id') if success else None

    def test_logout(self):
        """Test logout"""
        print("\n=== LOGOUT TEST ===")
        success, response = self.run_test("Logout", "POST", "auth/logout", 200)
        if success:
            self.session.cookies.clear()  # Clear session cookies
        return success

def main():
    print("🚀 Starting SnapPoint API Testing...")
    tester = SnapPointAPITester()

    # Health check
    tester.test_health_check()

    # Authentication
    if not tester.test_auth_flow():
        print("❌ Authentication failed, stopping tests")
        return 1

    # Test authenticated endpoints
    tester.test_auth_me()
    tester.test_kategori()
    
    # Test main functionality
    income_id, expense_id = tester.test_transaksi_flow()
    stock_id = tester.test_stok_flow()
    kas_id = tester.test_kas_flow()
    investor_id = tester.test_investor_flow()
    
    # Test dashboard and predictions
    tester.test_dashboard_endpoints()
    tester.test_prediction_flow()
    
    # Test admin functions
    user_id = tester.test_user_management()
    
    # Logout
    tester.test_logout()

    # Print results
    print(f"\n📊 FINAL RESULTS:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed tests:")
        for failed in tester.failed_tests:
            print(f"   - {failed}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())