// app/page.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import {
  Users,
  Car,
  Package,
  Phone,
  Calendar,
  Shield,
  ChevronRight,
  ArrowRight,
  Home as HomeIcon,
} from 'lucide-react'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function Home() {
  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Visitor Management Reception Aide',
      description:
        'Efficient check-in/check-out system for all office visitors with digital visitor badges.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: <Car className="h-8 w-8" />,
      title: 'Vehicle Tracking.',
      description: 'Track vehicle entry/exit with mileage logging for security and logistics.',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: <Package className="h-8 w-8" />,
      title: 'Parcel Management',
      description: 'Log and track all incoming and outgoing parcels with recipient notifications.',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: <Phone className="h-8 w-8" />,
      title: 'Call Management',
      description: 'Track employee phone calls with duration and cost analysis.',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: 'Travel Logs',
      description: 'Monitor employee travel with departure and return time tracking.',
      color: 'bg-red-100 text-red-600',
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Security Integration',
      description: 'Seamless integration with security systems for comprehensive access control.',
      color: 'bg-indigo-100 text-indigo-600',
    },
  ]

  const stats = [
    { number: '500+', label: 'Daily Visitors' },
    { number: '1,200+', label: 'Vehicles Tracked' },
    { number: '300+', label: 'Parcels Daily' },
    { number: '99%', label: 'Satisfaction Rate' },
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Office Manager, TechCorp',
      content:
        'This system revolutionized our reception management. 80% reduction in check-in time!',
      avatar: 'SJ',
    },
    {
      name: 'Michael Chen',
      role: 'Security Director, SecurePlus',
      content: 'The vehicle tracking feature alone has improved our security protocols by 60%.',
      avatar: 'MC',
    },
    {
      name: 'Emma Wilson',
      role: 'HR Manager, GrowthLabs',
      content: 'Best investment we made for office management. Easy to use and highly efficient.',
      avatar: 'EW',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Modern <span className="text-blue-600">Reception Management</span> System
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Streamline visitor check-ins, vehicle tracking, parcel management, and more with our
              all-in-one reception aid solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signin"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/demo"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Schedule Demo
              </Link>
            </div>
          </div>

          {/* Hero Image/Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {`From visitor management to security integration, we've got all your reception needs covered.`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300"
              >
                <div className={`${feature.color} p-3 rounded-lg w-fit mb-4`}>{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <Link
                  href={`/features#${feature.title.toLowerCase().replace(' ', '-')}`}
                  className="text-blue-600 font-medium flex items-center space-x-1 hover:text-blue-700"
                >
                  <span>Learn more</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple and Efficient Workflow
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              See how ReceptionAid transforms your reception management in just a few steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Visitor Check-in',
                desc: 'Digital check-in with automated notifications',
              },
              {
                step: '02',
                title: 'Data Collection',
                desc: 'Capture all necessary visitor information',
              },
              {
                step: '03',
                title: 'Real-time Tracking',
                desc: 'Monitor all activities in real-time dashboard',
              },
              { step: '04', title: 'Reporting', desc: 'Generate detailed reports and analytics' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-blue-600 text-2xl font-bold mb-4">{item.step}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Leading Companies
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              See what our clients have to say about their experience with ReceptionAid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {testimonial.avatar}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">{testimonial.content}</p>
                <div className="flex text-yellow-400 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Reception Management?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join hundreds of companies already using ReceptionAid to streamline their operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
              >
                Contact Sales
              </Link>
            </div>
            <p className="text-blue-200 mt-6 text-sm">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
