'use client'

import { LandingPageHeader } from "@/components/landing/landing-header"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { GrowthFlowSection } from "@/components/landing/growth-flow-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { CTASection } from "@/components/landing/cta-section"
import { LandingFooter } from "@/components/landing/landing-footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <LandingPageHeader />

      {/* ヒーローセクション */}
      <HeroSection />

      {/* 特徴セクション */}
      <FeaturesSection />

      {/* 成長フローセクション */}
      <GrowthFlowSection />

      {/* 料金セクション */}
      <PricingSection />

      {/* お客様の声セクション */}
      <TestimonialsSection />

      {/* CTAセクション */}
      <CTASection />

      {/* フッター */}
      <LandingFooter />
    </div>
  )
}
