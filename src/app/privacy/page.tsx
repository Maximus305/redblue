"use client"
import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => typeof window !== 'undefined' && window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <img 
                src="/partykitelogo.png" 
                alt="Partykite Logo" 
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-gray-900">Partykite</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Header Bar */}
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-lg font-medium tracking-wide text-gray-900 font-mono">
            PRIVACY POLICY
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <div className="space-y-8">
            {/* Title Section */}
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">Privacy Policy</h2>
              <p className="text-sm text-gray-500">Last Updated: March 18, 2025</p>
              
              <p className="text-gray-700 leading-relaxed">
                Party Kite is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by Party Kite.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                This Privacy Policy applies to the Party Kite app and its associated services. By accessing or using Party Kite, you agree to the collection, storage, use, and disclosure of your personal information as described in this Privacy Policy.
              </p>
            </div>

            {/* Section 1 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">1. Information We Collect</h3>
              
              <p className="text-gray-700 leading-relaxed">
                Party Kite collects several different types of information to provide and improve the service:
              </p>
              
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  <strong>• Personal Data:</strong> While using Party Kite, you may be asked to provide personally identifiable information. This may include:
                </p>
                <div className="pl-6 space-y-1">
                  <p className="text-gray-700">- Email address</p>
                  <p className="text-gray-700">- First name and last name</p>
                  <p className="text-gray-700">- Usage data</p>
                </div>
                
                <p className="text-gray-700 leading-relaxed">
                  <strong>• Usage Data:</strong> Party Kite may collect information that your device sends when you visit the service or access it through a mobile device.
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">2. Use of Data</h3>
              
              <p className="text-gray-700 leading-relaxed">
                Party Kite uses collected data to:
              </p>
              
              <div className="space-y-2">
                <p className="text-gray-700">• Provide and maintain the service</p>
                <p className="text-gray-700">• Notify you about changes to the service</p>
                <p className="text-gray-700">• Allow you to participate in interactive features</p>
                <p className="text-gray-700">• Provide customer support</p>
                <p className="text-gray-700">• Gather analysis to improve the service</p>
                <p className="text-gray-700">• Monitor usage</p>
                <p className="text-gray-700">• Detect, prevent and address technical issues</p>
              </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">3. Transfer of Data</h3>
              
              <p className="text-gray-700 leading-relaxed">
                Your information, including Personal Data, may be transferred to and maintained on computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                Your consent to this Privacy Policy followed by your submission of information represents your agreement to that transfer.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">4. Disclosure of Data</h3>
              
              <p className="text-gray-700 leading-relaxed">
                Party Kite may disclose your Personal Data in the following situations:
              </p>
              
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  <strong>• To Service Providers:</strong> Party Kite may share your personal information with third-party service providers to perform tasks and assist in providing the service.
                </p>
                
                <p className="text-gray-700 leading-relaxed">
                  <strong>• For Business Transfers:</strong> Personal information may be shared or transferred in connection with any merger, sale of company assets, financing, or acquisition of all or a portion of the business.
                </p>
                
                <p className="text-gray-700 leading-relaxed">
                  <strong>• With Your Consent:</strong> Your personal information may be disclosed for any other purpose with your consent.
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">5. Security of Data</h3>
              
              <p className="text-gray-700 leading-relaxed">
                The security of your data is important but remember that no method of transmission over the Internet or electronic storage is 100% secure. While Party Kite strives to use commercially acceptable means to protect your Personal Data, absolute security cannot be guaranteed.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">6. Your Data Protection Rights</h3>
              
              <p className="text-gray-700 leading-relaxed">
                If you are a resident of the European Economic Area (EEA), you have certain data protection rights. Party Kite aims to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data.
              </p>
              
              <p className="text-gray-700 leading-relaxed">You have the right to:</p>
              <div className="space-y-2">
                <p className="text-gray-700">• Access and receive a copy of your personal data</p>
                <p className="text-gray-700">• Rectify or update your personal data</p>
                <p className="text-gray-700">• Request deletion of your personal data</p>
                <p className="text-gray-700">• Request restriction of processing of your personal data</p>
                <p className="text-gray-700">• Object to processing of your personal data</p>
                <p className="text-gray-700">• Request transfer of your personal data</p>
              </div>
            </div>

            {/* Section 7 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">7. Changes to This Privacy Policy</h3>
              
              <p className="text-gray-700 leading-relaxed">
                Party Kite may update this Privacy Policy from time to time. You will be notified of any changes by posting the new Privacy Policy on this page and updating the date at the top.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when posted on this page.
              </p>
            </div>

            {/* Section 8 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">8. Contact Us</h3>
              
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us here:
              </p>
              
              <p className="text-gray-900 font-medium">
                team@partykite.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}