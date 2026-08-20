import React from 'react';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { Button, Input, Textarea, Card } from '../../components/ui';
export function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-4">
          Get in Touch
        </h1>
        <p className="text-lg text-charcoal-light max-w-2xl mx-auto">
          Have a question about an order, a custom project, or just want to say
          hello? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-6">
            <h3 className="font-serif font-semibold text-xl text-charcoal mb-6">
              Contact Information
            </h3>
            <div className="space-y-6">
              <div className="flex items-start">
                <MessageCircle className="w-6 h-6 text-brand-500 mr-4 flex-shrink-0" />
                <div>
                  <p className="font-medium text-charcoal">
                    WhatsApp
                  </p>
                  <p className="text-charcoal-light text-sm mt-1">
                    +91 xxxxx xxxxx
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="w-6 h-6 text-brand-500 mr-4 flex-shrink-0" />
                <div>
                  <p className="font-medium text-charcoal">Phone</p>
                  <p className="text-charcoal-light text-sm mt-1">
                    +91 xxxxx xxxxx
                  </p>
                  <p className="text-xs text-charcoal-lighter mt-1">
                    Mon-Sat, 10am - 6pm
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="w-6 h-6 text-brand-500 mr-4 flex-shrink-0" />
                <div>
                  <p className="font-medium text-charcoal">Email</p>
                  <p className="text-charcoal-light text-sm mt-1">
                    hello@shilpsahayak.in
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="w-6 h-6 text-brand-500 mr-4 flex-shrink-0" />
                <div>
                  <p className="font-medium text-charcoal">Studio</p>
                  <p className="text-charcoal-light text-sm mt-1">
                    PATIALA, PUNJAB 147001 <br />
                    <br />
                  </p>
                  <p className="text-xs text-charcoal-lighter mt-1">
                    By appointment only
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-8">
            <h3 className="font-serif font-semibold text-2xl text-charcoal mb-6">
              Send a Message
            </h3>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input label="Your Name" placeholder="Rahul Sharma" required />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="rahul@example.com"
                  required />
                
              </div>
              <Input label="Subject" placeholder="Order Inquiry" required />
              <Textarea
                label="Message"
                placeholder="How can we help you?"
                className="min-h-[150px]"
                required />
              
              <Button type="submit" size="lg">
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>);

}