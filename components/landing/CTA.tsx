import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-br from-accent-primary via-accent-hover to-accent-primary p-12 md:p-16 text-center overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent)]" />

          <div className="relative flex flex-col gap-6 items-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to lay your first block?
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Join entrepreneurs who are turning their ideas into reality with AI-powered guidance
            </p>
            <div className="pt-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 min-w-[200px] px-6 py-3 rounded-xl bg-white text-accent-primary font-semibold hover:bg-white/90 transition-colors cursor-pointer"
              >
                Start Building Now
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Made with Bob
