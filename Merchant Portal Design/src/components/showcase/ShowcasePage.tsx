import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { FileText, Video, Presentation, ChevronLeft, ChevronRight } from 'lucide-react';

export function ShowcasePage() {
  const [activeTab, setActiveTab] = useState('slides');
  const [pdfPage, setPdfPage] = useState(() => {
    // Load saved page from localStorage
    const saved = localStorage.getItem('showcase-pdf-page');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [videoTime, setVideoTime] = useState(() => {
    // Load saved video time from localStorage
    const saved = localStorage.getItem('showcase-video-time');
    return saved ? parseFloat(saved) : 0;
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Save video progress to localStorage
  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const currentTime = e.currentTarget.currentTime;
    setVideoTime(currentTime);
    localStorage.setItem('showcase-video-time', currentTime.toString());
  };

  // Save video progress when switching tabs
  useEffect(() => {
    if (activeTab !== 'video' && videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setVideoTime(currentTime);
      localStorage.setItem('showcase-video-time', currentTime.toString());
    }
  }, [activeTab]);

  // Restore video progress when switching back to video tab
  useEffect(() => {
    if (activeTab === 'video' && videoRef.current && videoTime > 0) {
      videoRef.current.currentTime = videoTime;
    }
  }, [activeTab, videoTime]);

  // Save PDF page to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('showcase-pdf-page', pdfPage.toString());
  }, [pdfPage]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capstone Showcase</h1>
          <p className="text-muted-foreground mt-1">
            View our presentation slides and demo video
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="slides" className="flex items-center gap-2">
            <Presentation className="h-4 w-4" />
            Presentation Slides
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            WhatsApp Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slides" className="space-y-4">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Booklyn Booking Capstone Showcase Slides
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPdfPage(Math.max(1, pdfPage - 1))}
                  disabled={pdfPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                  Page {pdfPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPdfPage(pdfPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950" style={{ height: 'calc(100vh - 240px)', minHeight: '700px' }}>
                <iframe
                  key={pdfPage}
                  ref={iframeRef}
                  src={`/Booklyn Booking Capstone Showcase Slides.pdf#toolbar=0&navpanes=0&scrollbar=1&view=Fit&page=${pdfPage}`}
                  className="w-full h-full border-0"
                  title="Booklyn Booking Capstone Showcase Slides"
                />
              </div>
              <div className="mt-4 flex gap-2 px-6 pb-6">
                <a
                  href="/Booklyn Booking Capstone Showcase Slides.pdf"
                  download
                  className="text-sm text-primary hover:underline"
                >
                  Download PDF
                </a>
                <span className="text-muted-foreground">|</span>
                <a
                  href="/Booklyn Booking Capstone Showcase Slides.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Open in new tab
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5" />
                WhatsApp Bot Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full h-full flex items-center justify-center bg-black" style={{ height: 'calc(100vh - 240px)', minHeight: '700px' }}>
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-full"
                  style={{ maxHeight: '100%', objectFit: 'contain' }}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onPause={() => {
                    // Save progress when paused
                    if (videoRef.current) {
                      localStorage.setItem('showcase-video-time', videoRef.current.currentTime.toString());
                    }
                  }}
                >
                  <source src="/whatsappdemo.MP4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="mt-4 px-6 pb-6">
                <a
                  href="/whatsappdemo.MP4"
                  download
                  className="text-sm text-primary hover:underline"
                >
                  Download Video
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">About This Showcase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            This showcase demonstrates the Booklyn Booking platform, an intelligent booking 
            management system with WhatsApp integration.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>AI-powered conversational booking through WhatsApp</li>
            <li>Comprehensive merchant portal for business management</li>
            <li>Real-time calendar and booking management</li>
            <li>Customer reviews and engagement tools</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

