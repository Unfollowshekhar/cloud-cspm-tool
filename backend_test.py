#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CSPMAPITester:
    def __init__(self, base_url="https://aws-misconfig-check.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.scan_results = None

    def run_test(self, name, method, endpoint, expected_status=200, data=None, validate_func=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                try:
                    response_data = response.json()
                    if validate_func:
                        validation_result = validate_func(response_data)
                        if validation_result is True:
                            self.tests_passed += 1
                            print(f"✅ Passed - Status: {response.status_code}, Validation: OK")
                        else:
                            print(f"❌ Failed - Status: {response.status_code}, Validation: {validation_result}")
                            success = False
                    else:
                        self.tests_passed += 1
                        print(f"✅ Passed - Status: {response.status_code}")
                    return success, response_data
                except json.JSONDecodeError:
                    # For file downloads, we expect non-JSON responses
                    if expected_status == 200 and 'export' in endpoint:
                        self.tests_passed += 1
                        print(f"✅ Passed - Status: {response.status_code} (File download)")
                        return True, response.content
                    else:
                        print(f"❌ Failed - Invalid JSON response")
                        return False, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def validate_root_response(self, data):
        """Validate root API response"""
        if "message" not in data:
            return "Missing 'message' field"
        if "CSPM" not in data["message"]:
            return "Message doesn't contain 'CSPM'"
        return True

    def validate_regions_response(self, data):
        """Validate regions API response"""
        if "regions" not in data:
            return "Missing 'regions' field"
        regions = data["regions"]
        if not isinstance(regions, list):
            return "Regions is not a list"
        if len(regions) != 18:
            return f"Expected 18 regions, got {len(regions)}"
        expected_regions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2"]
        for region in expected_regions:
            if region not in regions:
                return f"Missing expected region: {region}"
        return True

    def validate_rules_response(self, data):
        """Validate rules API response"""
        if "rules" not in data:
            return "Missing 'rules' field"
        if "total" not in data:
            return "Missing 'total' field"
        rules = data["rules"]
        if not isinstance(rules, list):
            return "Rules is not a list"
        if len(rules) != 22:
            return f"Expected 22 rules, got {len(rules)}"
        if data["total"] != 22:
            return f"Total field should be 22, got {data['total']}"
        
        # Validate rule structure
        required_fields = ["check_id", "title", "service", "default_severity", "cis_reference", "remediation"]
        for rule in rules[:3]:  # Check first 3 rules
            for field in required_fields:
                if field not in rule:
                    return f"Rule missing required field: {field}"
        
        # Check for expected services
        services = set(rule["service"] for rule in rules)
        expected_services = {"IAM", "S3", "EC2", "CloudTrail"}
        if not expected_services.issubset(services):
            return f"Missing expected services. Got: {services}"
        
        return True

    def validate_scan_response(self, data):
        """Validate scan API response"""
        required_fields = [
            "findings", "findings_by_severity", "findings_by_service", 
            "total_findings", "account_id", "scan_time", "demo_mode"
        ]
        for field in required_fields:
            if field not in data:
                return f"Missing required field: {field}"
        
        if not isinstance(data["findings"], list):
            return "Findings is not a list"
        
        if not isinstance(data["findings_by_severity"], dict):
            return "findings_by_severity is not a dict"
        
        if not isinstance(data["findings_by_service"], dict):
            return "findings_by_service is not a dict"
        
        if data["demo_mode"] is not True:
            return "demo_mode should be True"
        
        # Check severity counts
        severity_keys = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        for key in severity_keys:
            if key not in data["findings_by_severity"]:
                return f"Missing severity key: {key}"
        
        # Check service counts
        service_keys = {"IAM", "S3", "EC2", "CloudTrail"}
        for key in service_keys:
            if key not in data["findings_by_service"]:
                return f"Missing service key: {key}"
        
        # Validate findings structure
        if data["findings"]:
            finding = data["findings"][0]
            required_finding_fields = [
                "finding_id", "service", "check_id", "title", "description",
                "resource_id", "region", "severity", "risk_score", "remediation", "cis_reference"
            ]
            for field in required_finding_fields:
                if field not in finding:
                    return f"Finding missing required field: {field}"
        
        return True

    def test_root_api(self):
        """Test GET /api/"""
        return self.run_test(
            "Root API endpoint",
            "GET",
            "",
            200,
            validate_func=self.validate_root_response
        )

    def test_regions_api(self):
        """Test GET /api/regions"""
        return self.run_test(
            "Regions API endpoint",
            "GET",
            "regions",
            200,
            validate_func=self.validate_regions_response
        )

    def test_rules_api(self):
        """Test GET /api/rules"""
        return self.run_test(
            "Rules API endpoint",
            "GET",
            "rules",
            200,
            validate_func=self.validate_rules_response
        )

    def test_scan_api(self):
        """Test POST /api/scan"""
        success, data = self.run_test(
            "Scan API endpoint",
            "POST",
            "scan",
            200,
            data={"region": "us-east-1"},
            validate_func=self.validate_scan_response
        )
        if success:
            self.scan_results = data
        return success, data

    def test_scan_results_api(self):
        """Test GET /api/scan/results"""
        return self.run_test(
            "Scan Results API endpoint",
            "GET",
            "scan/results",
            200,
            validate_func=self.validate_scan_response
        )

    def test_export_json_api(self):
        """Test GET /api/scan/export/json"""
        return self.run_test(
            "Export JSON API endpoint",
            "GET",
            "scan/export/json",
            200
        )

    def test_export_csv_api(self):
        """Test GET /api/scan/export/csv"""
        return self.run_test(
            "Export CSV API endpoint",
            "GET",
            "scan/export/csv",
            200
        )

def main():
    print("🚀 Starting CSPM API Testing")
    print("=" * 50)
    
    tester = CSPMAPITester()
    
    # Test all endpoints in order
    test_methods = [
        tester.test_root_api,
        tester.test_regions_api,
        tester.test_rules_api,
        tester.test_scan_api,
        tester.test_scan_results_api,
        tester.test_export_json_api,
        tester.test_export_csv_api,
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.tests_run += 1
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.scan_results:
        print(f"📈 Scan Results Summary:")
        print(f"   Total Findings: {tester.scan_results.get('total_findings', 'N/A')}")
        print(f"   Account ID: {tester.scan_results.get('account_id', 'N/A')}")
        print(f"   Region: {tester.scan_results.get('region', 'N/A')}")
        print(f"   Scan Time: {tester.scan_results.get('scan_time', 'N/A')}s")
        print(f"   Demo Mode: {tester.scan_results.get('demo_mode', 'N/A')}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"✅ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())