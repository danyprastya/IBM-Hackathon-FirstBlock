import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_METADATA } from "@/lib/data/content";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-secondary to-bg-primary opacity-50" />
      
      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        {/* Logo/Brand */}
        <div className="inline-block">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-accent-primary" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
          <span className="text-text-primary">{APP_METADATA.name}</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-text-secondary font-light max-w-2xl mx-auto">
          {APP_METADATA.tagline}
        </p>

        {/* Description */}
        <p className="text-base md:text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
          {APP_METADATA.description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 min-w-[200px] px-6 py-3 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-hover transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-w-[200px] px-6 py-3 rounded-lg border border-border text-text-heading font-semibold hover:bg-input-bg transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Subtle indicator */}
        <div className="pt-12">
          <p className="text-xs text-text-muted uppercase tracking-wider">
            Powered by IBM Watsonx AI
          </p>
        </div>
      </div>
    </section>
  );
}

// Made with Bob
