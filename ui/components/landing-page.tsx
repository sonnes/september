"use client";

import React from "react";
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPageComponent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold md:text-6xl">
            👋 , I&apos;m September
          </h1>
          <p className="mt-4 text-xl">
            Empowering communication for people with ALS, MND, and speech
            difficulties
          </p>
          <Link href="/conversations">
            <Button
              className="mt-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              size="lg"
            >
              Get Started
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <main className="container mx-auto px-6 py-16">
        {/* Text-to-Speech */}
        <section className="mb-20 md:flex items-center">
          <div className="md:w-1/2 md:pr-8">
            <h3 className="text-2xl font-semibold text-accent mb-4">
              Text-to-Speech
            </h3>
            <p className="text-foreground mb-4">
              Choose from a variety of voices or clone your own to express
              yourself in a way that feels natural and personal to you.
            </p>
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              Learn More
            </Button>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0">
            <img
              src="https://placehold.co/400x300?text=Text-to-Speech"
              alt="Text-to-Speech Feature"
              className="rounded-lg shadow-lg"
            />
          </div>
        </section>

        {/* Voice Cloning */}
        <section className="mb-20 md:flex items-center flex-row-reverse">
          <div className="md:w-1/2 md:pl-8">
            <h3 className="text-2xl font-semibold text-secondary mb-4">
              Voice Cloning
            </h3>
            <p className="text-foreground mb-4">
              Preserve your unique voice by creating a digital clone. Speak with
              your own voice, even as your condition progresses.
            </p>
            <Button
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              Learn More
            </Button>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0">
            <img
              src="https://placehold.co/400x300?text=Voice+Cloning"
              alt="Voice Cloning Feature"
              className="rounded-lg shadow-lg"
            />
          </div>
        </section>

        {/* Speech-to-Text */}
        <section className="mb-20 md:flex items-center">
          <div className="md:w-1/2 md:pr-8">
            <h3 className="text-2xl font-semibold text-primary mb-4">
              Speech-to-Text
            </h3>
            <p className="text-foreground mb-4">
              Effortlessly transcribe conversations in real-time, making it
              easier to participate in discussions and capture important
              information.
            </p>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Learn More
            </Button>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0">
            <img
              src="https://placehold.co/400x300?text=Speech-to-Text"
              alt="Speech-to-Text Feature"
              className="rounded-lg shadow-lg"
            />
          </div>
        </section>

        {/* Auto-Complete */}
        <section className="mb-20 md:flex items-center flex-row-reverse">
          <div className="md:w-1/2 md:pl-8">
            <h3 className="text-2xl font-semibold text-accent mb-4">
              Auto-Complete
            </h3>
            <p className="text-foreground mb-4">
              Intelligent prediction of words and phrases based on context,
              dramatically reducing the time and effort needed to communicate.
            </p>
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              Learn More
            </Button>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0">
            <img
              src="https://placehold.co/400x300?text=Auto-Complete"
              alt="Auto-Complete Feature"
              className="rounded-lg shadow-lg"
            />
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-12 mt-20">
          <h2 className="text-3xl font-bold text-primary mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-foreground mb-8">
            Join September today and experience a new level of communication
            freedom.
          </p>
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            Sign Up for Free
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-between">
            <div className="w-full md:w-1/4 mb-6 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">September</h3>
              <p className="text-primary-foreground/80">
                Empowering communication for all.
              </p>
            </div>
            <div className="w-full md:w-1/4 mb-6 md:mb-0">
              <h4 className="text-lg font-semibold mb-2">Features</h4>
              <ul className="text-primary-foreground/80">
                <li className="mb-2 flex items-center">
                  <SpeakerWaveIcon className="h-5 w-5 mr-2" />
                  Text-to-Speech
                </li>
                <li className="mb-2 flex items-center">
                  <MicrophoneIcon className="h-5 w-5 mr-2" />
                  Voice Cloning
                </li>
                <li className="mb-2 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Speech-to-Text
                </li>
                <li className="flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                  Auto-Complete
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/4 mb-6 md:mb-0">
              <h4 className="text-lg font-semibold mb-2">Contact</h4>
              <p className="text-primary-foreground/80">
                support@september.com
              </p>
              <p className="text-primary-foreground/80">1-800-SEPTEMBER</p>
            </div>
            <div className="w-full md:w-1/4">
              <h4 className="text-lg font-semibold mb-2">Follow Us</h4>
              <div className="flex space-x-4">
                {/* Add social media icons here */}
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/60">
            <p>&copy; 2024 September. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
