import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Send, Loader2, Sparkles, Bug, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function SmartHelp() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [reportText, setReportText] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Keep the same conversation when navigating between pages
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  const askHelp = async (question?: string) => {
    const q = question || input.trim();
    if (!q && messages.length > 0) return;

    const userMessage = q || "What can I do on this page?";
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('smart-help', {
        body: { currentPage: location.pathname, userQuestion: userMessage },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't get help right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      askHelp("What can I do on this page? Give me a quick guide.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) askHelp();
  };

  const handleSendReport = async () => {
    if (!reportText.trim()) return;
    setSendingReport(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          emails: ['shaheedbayat1@gmail.com'],
          invoiceNumber: 'FEEDBACK',
          clientName: user?.email || 'Anonymous User',
          amount: 'N/A',
          currency: '',
          dueDate: new Date().toISOString().split('T')[0],
          publicUrl: `${window.location.origin}${location.pathname}`,
          companyName: `Bug/Feedback Report — Page: ${location.pathname}`,
          customSubject: 'Bug/Feedback Report',
          customHtml: reportText.trim(),
        },
      });
      if (error) throw error;
      toast.success('Feedback sent! Thank you for helping us improve.');
      setReportMode(false);
      setReportText('');
    } catch {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setSendingReport(false);
    }
  };

  const quickQuestions = [
    "How do I create an invoice?",
    "How do I add a customer?",
    "How do I set up my company?",
  ];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          title="Need help?"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}

      {/* Help panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[360px] flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ maxHeight: 'min(520px, calc(100vh - 100px))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Smart Help</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Report a bug or missing feature"
                onClick={() => setReportMode(!reportMode)}
              >
                <Bug className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Report mode */}
          {reportMode && (
            <div className="border-b bg-destructive/5 px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-destructive">Report a bug or request a feature</p>
              <Textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Describe what's wrong or what's missing..."
                rows={3}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setReportMode(false); setReportText(''); }}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={handleSendReport} disabled={sendingReport || !reportText.trim()}>
                  {sendingReport ? 'Sending...' : 'Send Report'}
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: '200px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            {/* Quick questions when empty */}
            {messages.length === 0 && !loading && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-medium">Quick questions:</p>
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => askHelp(q)}
                    className="block w-full text-left rounded-lg border border-border/60 px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t px-3 py-2.5 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="h-9 text-sm"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={loading || !input.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
