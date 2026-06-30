import React from "react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-300 py-12 px-6">

      <div className="max-w-5xl mx-auto bg-[#161B22] rounded-xl shadow-lg p-10">

        <h1 className="text-4xl font-bold text-white mb-8">
          Privacy Policy
        </h1>

        <div className="space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-blue-400 mb-2">
              Information Collection
            </h2>

            <p>
              We process resumes and job descriptions uploaded by users
              for recruitment and resume analysis purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-400 mb-2">
              AI Processing
            </h2>

            <p>
              Uploaded files may be processed using OCR,
              Natural Language Processing (NLP), and AI services
              to extract structured information and calculate
              resume matching scores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-400 mb-2">
              Disclaimer
            </h2>

            <p>
              This software uses cloud services and AI/LLM technologies to process your inputs. Data may be transmitted to external systems for computation. Please avoid submitting sensitive, confidential, or regulated information.
            </p>

            <p className="mt-4">
              By using this software, you acknowledge and accept full responsibility for all uploaded data. The Company and its developers are not liable for any loss, misuse, disclosure, or reliance on AI-generated outputs.
            </p>
          </section>

        </div>

      </div>

    </div>
  );
};

export default PrivacyPolicy;