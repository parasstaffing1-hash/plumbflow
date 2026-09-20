import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useForm, ValidationError } from "@formspree/react";
import { MarketingPage, Section } from "@/components/marketing/Site";
import { usePlatform } from "@/lib/platform";

const TITLE = "Contact RCH PlumbFlow, talk to a person";
const DESCRIPTION =
  "Questions about RCH PlumbFlow before you sign up? Send us a message, or ring the number on the page and speak to someone who has done the job.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data, submitContact } = usePlatform();
  const [state, handleSubmit] = useForm("xzezznba");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const formRef = useRef(form);
  formRef.current = form;
  const submitContactRef = useRef(submitContact);
  submitContactRef.current = submitContact;

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: event.target.value })),
    };
  }

  useEffect(() => {
    if (state.succeeded) {
      toast.success("Message sent! We'll get back to you shortly.");
      submitContactRef.current({
        name: formRef.current.name.trim().slice(0, 120),
        email: formRef.current.email.trim().slice(0, 255),
        phone: formRef.current.phone.trim().slice(0, 40),
        message: formRef.current.message.trim().slice(0, 2000),
      });
    }
  }, [state.succeeded]);

  useEffect(() => {
    if (state.errors && state.errors.getFormErrors().length > 0) {
      toast.error("Could not send to Formspree. Please check the fields or ring us.");
    }
  }, [state.errors]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Name, email and message are needed.");
      return;
    }

    await handleSubmit(event);
  }

  return (
    <MarketingPage>
      <section className="bg-ink px-4 py-16 text-paper">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Get in touch</h1>
          <p className="mt-4 max-w-2xl text-lg text-fog">
            No call centre. Messages go to the people who built it.
          </p>
        </div>
      </section>

      <Section tone="paper">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Send a message</h2>
            {state.succeeded ? (
              <div className="mt-5 rounded-xl border border-go/30 bg-go-wash p-5">
                <p className="text-lg font-semibold text-go">Message received</p>
                <p className="mt-2 text-[16px] text-slate">
                  We&rsquo;ll come back to you within one working day. If it&rsquo;s urgent, ring{" "}
                  {data.settings.contactPhone}.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="label-caps text-slate">Your name</span>
                  <input
                    id="name"
                    name="name"
                    {...field("name")}
                    required
                    maxLength={120}
                    className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px]"
                  />
                  <ValidationError
                    prefix="Name"
                    field="name"
                    errors={state.errors}
                    className="mt-1 text-sm text-emergency"
                  />
                </label>
                <label className="block">
                  <span className="label-caps text-slate">Email</span>
                  <input
                    id="email"
                    name="email"
                    {...field("email")}
                    type="email"
                    required
                    maxLength={255}
                    className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px]"
                  />
                  <ValidationError
                    prefix="Email"
                    field="email"
                    errors={state.errors}
                    className="mt-1 text-sm text-emergency"
                  />
                </label>
                <label className="block">
                  <span className="label-caps text-slate">Phone (optional)</span>
                  <input
                    id="phone"
                    name="phone"
                    {...field("phone")}
                    type="tel"
                    maxLength={40}
                    className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px]"
                  />
                  <ValidationError
                    prefix="Phone"
                    field="phone"
                    errors={state.errors}
                    className="mt-1 text-sm text-emergency"
                  />
                </label>
                <label className="block">
                  <span className="label-caps text-slate">Message</span>
                  <textarea
                    id="message"
                    name="message"
                    {...field("message")}
                    required
                    rows={5}
                    maxLength={2000}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px]"
                  />
                  <ValidationError
                    prefix="Message"
                    field="message"
                    errors={state.errors}
                    className="mt-1 text-sm text-emergency"
                  />
                </label>
                <button
                  type="submit"
                  disabled={state.submitting}
                  className="tap w-full rounded-xl bg-amber px-6 py-4 text-lg font-semibold text-ink disabled:opacity-60"
                >
                  {state.submitting ? "Sending..." : "Send message"}
                </button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Or just ring</h2>
            <p className="mt-4 text-2xl font-semibold tabular-nums">{data.settings.contactPhone}</p>
            <p className="mt-2 text-[17px] text-slate">Monday to Friday, 8am to 6pm.</p>
            <p className="mt-6 text-xl font-semibold break-all">{data.settings.contactEmail}</p>
            <p className="mt-6 text-[16px] leading-relaxed text-slate">
              RCH PlumbFlow
              <br />
              Northampton, Northamptonshire
              <br />
              NN1
            </p>
          </div>
        </div>
      </Section>
    </MarketingPage>
  );
}
