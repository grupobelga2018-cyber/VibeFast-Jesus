import Hero from "@/components/landing/Hero"
import Problem from "@/components/landing/Problem"
import Features from "@/components/landing/Features"
import Pricing from "@/components/landing/Pricing"
import Testimonials from "@/components/landing/Testimonials"
import FAQ from "@/components/landing/FAQ"
import FinalCta from "@/components/landing/FinalCta"
import Waitlist from "@/components/landing/Waitlist"
import BookingChannels from "@/components/landing/BookingChannels"
import config from "@/config"

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Features />
      {config.features.pricing && <Pricing />}
      {config.features.booking && <BookingChannels />}
      <Testimonials />
      <FAQ />
      <FinalCta />
      {config.features.waitlist && <Waitlist />}
    </>
  )
}
