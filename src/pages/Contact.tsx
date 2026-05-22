import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMessages, useSendMessage } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { MessageSquare, PenSquare, Send } from 'lucide-react';

const composeSchema = z.object({
  receiver_id: z.string().min(1, 'Receiver ID is required'),
  message: z.string().min(1, 'Message cannot be empty'),
});

type ComposeFormValues = z.infer<typeof composeSchema>;

export default function Contact() {
  const { user } = useAuth();
  const { data: messages, isLoading, error } = useMessages();
  const sendMessage = useSendMessage();
  const [composeOpen, setComposeOpen] = useState(false);

  const form = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { receiver_id: '', message: '' },
  });

  const onSubmit = (values: ComposeFormValues) => {
    sendMessage.mutate(
      { receiverId: values.receiver_id, message: values.message },
      {
        onSuccess: () => {
          form.reset();
          setComposeOpen(false);
        },
      },
    );
  };

  return (
    <DashboardLayout
      title="Contact"
      showSearch={false}
      actions={
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <PenSquare className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="receiver_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiver User ID</FormLabel>
                      <FormControl>
                        <Input placeholder="User UUID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Type your message..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendMessage.isPending}>
                    <Send className="mr-2 h-4 w-4" />
                    {sendMessage.isPending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="max-w-3xl space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-destructive">
            Failed to load messages: {(error as Error).message}
          </p>
        )}

        {!isLoading && (!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3" />
            <p>No messages yet.</p>
          </div>
        )}

        {messages?.map((msg) => {
          const isSent = msg.sender_id === user?.id;
          return (
            <Card key={msg.id} className={cn(isSent && 'border-l-4 border-l-blue-400')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isSent ? 'Sent' : 'Received'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isSent ? `To: ${msg.receiver_id}` : `From: ${msg.sender_id}`}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
