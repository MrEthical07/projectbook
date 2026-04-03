<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { AlertTriangle, CheckCircle2, LoaderCircle, MailCheck } from "@lucide/svelte";
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import { resendVerificationSchema } from "$lib/schemas/auth.schema";
	import type { ActionData, PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	const resolveResendFormState = () => (form as ActionData | null)?.form ?? data.resendForm;

	const resendVerificationForm = superForm(resolveResendFormState(), {
		id: "resend-verification-form",
		validators: zod4Client(resendVerificationSchema)
	});
	const {
		form: resendForm,
		errors: resendErrors,
		message: resendMessage,
		submitting: resendSubmitting,
		enhance: enhanceResendForm
	} = resendVerificationForm;
</script>

<svelte:head>
	<title>Verify Email • ProjectBook</title>
	<meta
		name="description"
		content="Verify your email address to activate access to your workspace."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<main class="flex min-h-screen w-full items-center justify-center p-4 sm:p-8">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-2 text-center">
			{#if data.verificationState === "pending"}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
					<MailCheck class="size-6 text-primary" />
				</div>
				<Card.Title>Verify your email to continue</Card.Title>
				<Card.Description>Resend a verification link if needed.</Card.Description>
			{:else if data.verificationState === "success"}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15">
					<CheckCircle2 class="size-6 text-emerald-600" />
				</div>
				<Card.Title>Email verified successfully</Card.Title>
				<Card.Description>
					{#if data.verifiedEmail}
						<strong>{data.verifiedEmail}</strong> is now verified.
					{:else}
						Your account is now ready.
					{/if}
				</Card.Description>
			{:else}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15">
					<AlertTriangle class="size-6 text-destructive" />
				</div>
				<Card.Title>Link expired or invalid</Card.Title>
				<Card.Description>Please request a new verification email.</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-3">
			{#if data.verificationState === "success"}
				<Button class="w-full" href="/">Go to Dashboard</Button>
				<Button class="w-full" variant="outline" href="/auth">Back to Login</Button>
			{:else}
				<form
					method="POST"
					action="?/resend"
					class="space-y-3"
					use:enhanceResendForm
					novalidate
				>
					<div class="space-y-2">
						<Label for="verify-email">Email</Label>
						<Input
							id="verify-email"
							name="email"
							type="email"
							placeholder="name@company.com"
							bind:value={$resendForm.email}
							aria-invalid={$resendErrors.email?.length ? "true" : "false"}
						/>
						{#if $resendErrors.email?.length}
							<p class="text-xs text-destructive">{$resendErrors.email[0]}</p>
						{/if}
					</div>

					{#if $resendErrors._errors?.length}
						<p class="text-xs text-destructive">{$resendErrors._errors[0]}</p>
					{/if}

					{#if $resendMessage}
						<p class="text-center text-xs text-emerald-600">{$resendMessage}</p>
					{/if}

					<Button class="w-full" type="submit" disabled={$resendSubmitting}>
						{#if $resendSubmitting}
							<LoaderCircle class="size-4 animate-spin" />
							<span>Resending...</span>
						{:else}
							<span>Resend Verification</span>
						{/if}
					</Button>
				</form>

				<Button class="w-full" variant="outline" href="/auth">Back to Login</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
