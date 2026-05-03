import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { APP_METADATA } from "@/lib/data/content";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-20 bg-white">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-bg-secondary to-white opacity-60" />

      <div className="relative max-w-4xl mx-auto text-center flex flex-col gap-8 items-center">
        {/* Logo/Brand */}
        <div className="inline-block">
          <img
            src="/image/Logo2.png"
            alt="FirstBlock"
            className="size-16 mx-auto mb-2 object-contain"
          />
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text-heading">
          {APP_METADATA.name}
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
            className="inline-flex items-center justify-center gap-2 min-w-[200px] px-6 py-3 rounded-xl bg-accent-primary text-white font-semibold hover:bg-accent-hover transition-colors cursor-pointer card-hover"
          >
            Get Started
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-w-[200px] px-6 py-3 rounded-xl border border-border text-text-heading font-semibold hover:bg-input-bg transition-colors cursor-pointer"
          >
            Sign In
          </Link>
        </div>

        {/* Subtle indicator */}
        <div className="pt-8">
          <p className="text-xs text-text-muted uppercase tracking-wider">
            Powered by IBM Watsonx AI
          </p>
        </div>
      </div>
    </section>
  );
}

// Made with Bob
