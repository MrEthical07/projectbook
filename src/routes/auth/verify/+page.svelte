<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { LoaderCircle, MailCheck, ShieldCheck } from "@lucide/svelte";
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import { resendVerificationSchema, verifyEmailSchema } from "$lib/schemas/auth.schema";
	import type { ActionData, PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	const resolveVerifyFormState = () => (form as ActionData | null)?.verifyForm ?? data.verifyForm;
	const resolveResendFormState = () => (form as ActionData | null)?.resendForm ?? data.resendForm;

	const verifyAccountForm = superForm(resolveVerifyFormState(), {
		id: "verify-email-form",
		validators: zod4Client(verifyEmailSchema)
	});

	const resendVerificationForm = superForm(resolveResendFormState(), {
		id: "resend-verification-form",
		validators: zod4Client(resendVerificationSchema)
	});

	const {
		form: verifyForm,
		errors: verifyErrors,
		submitting: verifySubmitting,
		enhance: enhanceVerifyForm
	} = verifyAccountForm;

	const {
		form: resendForm,
		errors: resendErrors,
		message: resendMessage,
		submitting: resendSubmitting,
		enhance: enhanceResendForm
	} = resendVerificationForm;

	const verificationContextAvailable = $derived(
		$verifyForm.verificationId.trim().length > 0
	);
</script>

<svelte:head>
	<title>Verify Email • ProjectBook</title>
	<meta
		name="description"
		content="Verify your email address to activate your ProjectBook account."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<main class="flex min-h-screen w-full items-center justify-center p-4 sm:p-8">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-2 text-center">
			<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
				<MailCheck class="size-6 text-primary" />
			</div>
			<Card.Title>Verify your email with OTP</Card.Title>
			<Card.Description>
				Use this page for both verification-link and OTP flows.
			</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-6">
			<form
				method="POST"
				action="?/verify"
				class="space-y-3"
				use:enhanceVerifyForm
				novalidate
			>
				<input type="hidden" name="verificationId" bind:value={$verifyForm.verificationId} />

				<div class="space-y-2">
					<Label for="verification-code">Verification Code</Label>
					<Input
						id="verification-code"
						name="code"
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength={6}
						placeholder="Enter 6-digit code"
						bind:value={$verifyForm.code}
						aria-invalid={$verifyErrors.code?.length ? "true" : "false"}
					/>
					{#if $verifyErrors.code?.length}
						<p class="text-xs text-destructive">{$verifyErrors.code[0]}</p>
					{/if}
				</div>

				{#if verificationContextAvailable}
					<div class="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
						Verification context is ready. Enter the 6-digit OTP from your inbox and submit.
					</div>
				{:else}
					<div class="rounded-md border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
						This page supports OTP verification directly. Request a new OTP below to activate code
						verification on this screen.
					</div>
				{/if}

				{#if $verifyErrors._errors?.length}
					<p class="text-xs text-destructive">{$verifyErrors._errors[0]}</p>
				{/if}

				<Button
					class="w-full"
					type="submit"
					disabled={$verifySubmitting || !verificationContextAvailable}
				>
					{#if $verifySubmitting}
						<LoaderCircle class="size-4 animate-spin" />
						<span>Verifying...</span>
					{:else}
						<ShieldCheck class="size-4" />
						<span>Verify Account</span>
					{/if}
				</Button>
			</form>

			<div class="h-px w-full bg-border/70"></div>

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
						<span>Sending...</span>
					{:else}
						<span>Send New OTP</span>
					{/if}
				</Button>
			</form>

			<Button class="w-full" variant="outline" href="/auth">Back to Login</Button>
		</Card.Content>
	</Card.Root>
</main>
