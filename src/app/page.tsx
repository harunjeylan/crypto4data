'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles, Key, FileSpreadsheet, Shield } from 'lucide-react';

const features = [
  {
    title: 'Template',
    description: 'Design and customize certificate templates with text fields and QR codes',
    icon: FileText,
    href: '/template',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    title: 'Generate',
    description: 'Generate certificates from templates with digital signatures',
    icon: Sparkles,
    href: '/generate',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  {
    title: 'Key',
    description: 'Generate RSA key pairs for signing and verifying certificates',
    icon: Key,
    href: '/key',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  {
    title: 'Bulks',
    description: 'Bulk generate signatures and QR codes from CSV files',
    icon: FileSpreadsheet,
    href: '/bulks',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    title: 'Verify',
    description: 'Verify the authenticity of certificate signatures',
    icon: Shield,
    href: '/verify',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Certificate Generator
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create, customize, and generate secure certificates with digital signatures
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer group border-2 hover:border-primary/50">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-primary group-hover:translate-x-2 transition-transform">
                      <span className="text-sm font-medium">Get started</span>
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}