"use client";

import { useState } from "react";
import { Heading } from "@/components/catalyst/heading";
import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import SingleColumnLayout from "@/layouts/single-column";
import { Field, Label } from "@/components/catalyst/fieldset";
import { DocumentIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
} from "@/components/catalyst/dropdown";
import { Radio, RadioGroup, RadioField } from "@/components/catalyst/radio";

function SignUpForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    city: "",
    country: "",
    userType: "",
    diagnosis: "",
    yearOfDiagnosis: "",
    diagnosisDocument: null as File | null,
    termsAccepted: false,
    privacyAccepted: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, diagnosisDocument: file }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-zinc-900/10 dark:border-zinc-100/10 pb-12 md:grid-cols-3">
        <div>
          <Heading level={2}>Personal Information</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please provide your basic information to create your account.
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
          <div className="sm:col-span-4">
            <Field>
              <Label>Full Name</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Your full name"
              />
            </Field>
          </div>

          <div className="sm:col-span-4">
            <Field>
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="you@example.com"
              />
            </Field>
          </div>

          <div className="sm:col-span-4">
            <Field>
              <Label>Password</Label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="••••••••"
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field>
              <Label>City</Label>
              <Input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                placeholder="Your city"
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field>
              <Label>Country</Label>
              <Input
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                placeholder="Your country"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Medical Information Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-zinc-900/10 dark:border-zinc-100/10 pb-12 md:grid-cols-3">
        <div>
          <Heading level={2}>Medical Information</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            This information helps us ensure that we provide the voice cloning
            features only to people with speech disabilities.
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
          {/* Role Selection */}
          <div className="col-span-full">
            <Field>
              <Label>I am a</Label>
              <RadioGroup
                name="userType"
                value={formData.userType}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, userType: value }))
                }
                className="mt-2 flex gap-6"
              >
                <RadioField className="flex items-center gap-2">
                  <Radio value="patient" />
                  <Label>Patient</Label>
                </RadioField>
                <RadioField className="flex items-center gap-2">
                  <Radio value="caregiver" />
                  <Label>Caregiver</Label>
                </RadioField>
              </RadioGroup>
            </Field>
          </div>

          {/* Diagnosis Fields */}
          <div className="sm:col-span-4">
            <Field>
              <Label>Diagnosis</Label>
              <Input
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                required
                placeholder="Enter diagnosis"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field>
              <Label>Year of Diagnosis</Label>
              <Input
                name="yearOfDiagnosis"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.yearOfDiagnosis}
                onChange={handleInputChange}
                required
                placeholder="YYYY"
              />
            </Field>
          </div>

          {/* Document Upload */}
          <div className="col-span-full">
            <Field>
              <Label>Diagnosis Document</Label>
              <div className="mt-2 flex justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-10">
                <div className="text-center">
                  <DocumentIcon className="mx-auto h-12 w-12 text-zinc-300" />
                  <div className="mt-4 flex text-sm text-zinc-600 dark:text-zinc-400">
                    <label className="relative cursor-pointer rounded-md bg-white dark:bg-zinc-900 font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        name="diagnosisDocument"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    PDF, DOC up to 10MB
                  </p>
                </div>
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Consent Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-zinc-900/10 dark:border-zinc-100/10 pb-12 md:grid-cols-3">
        <div>
          <Heading level={2}>Consent</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please review and accept our terms and conditions.
          </p>
        </div>

        <div className="max-w-2xl space-y-6 md:col-span-2">
          <div className="space-y-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We collect and process your data to provide our voice cloning
              services. Your data will be shared with:
              <ul className="list-disc ml-6 mt-2">
                <li>
                  Our voice synthesis partners to create your digital voice
                </li>
                <li>Healthcare providers you explicitly authorize</li>
                <li>Research institutions (anonymized data only)</li>
              </ul>
            </p>

            <div className="flex gap-3">
              <input
                type="checkbox"
                id="terms"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleCheckboxChange}
                required
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-600"
              />
              <label
                htmlFor="terms"
                className="text-sm text-zinc-600 dark:text-zinc-400"
              >
                I agree to the{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Terms and Conditions
                </a>
              </label>
            </div>

            <div className="flex gap-3">
              <input
                type="checkbox"
                id="privacy"
                name="privacyAccepted"
                checked={formData.privacyAccepted}
                onChange={handleCheckboxChange}
                required
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-600"
              />
              <label
                htmlFor="privacy"
                className="text-sm text-zinc-600 dark:text-zinc-400"
              >
                I agree to the{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-x-6">
        <Button type="submit" className="w-full sm:w-auto">
          Create Account
        </Button>
      </div>
    </form>
  );
}

export default function SignUpPage() {
  return (
    <SingleColumnLayout title="Sign Up" color="cyan">
      <div className="p-6">
        <SignUpForm />
      </div>
    </SingleColumnLayout>
  );
}
