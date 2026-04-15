<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { AlertTriangle, LoaderCircle, MailCheck, ShieldCheck } from "@lucide/svelte";
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import {
		forgotPasswordSchema,
		resetPasswordOtpSchema,
		resetPasswordSchema
	} from "$lib/schemas/auth.schema";
	import type { ActionData, PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	const resolveOtpFormState = () => (form as ActionData | null)?.otpForm ?? data.otpForm;
	const resolveTokenFormState = () => (form as ActionData | null)?.tokenForm ?? data.tokenForm;
	const resolveResendFormState = () => (form as ActionData | null)?.resendForm ?? data.resendForm;

	const otpResetPasswordForm = superForm(resolveOtpFormState(), {
		id: "reset-password-otp-form",
		validators: zod4Client(resetPasswordOtpSchema)
	});
	const {
		form: otpForm,
		errors: otpErrors,
		submitting: otpSubmitting,
		enhance: enhanceOtpResetForm
	} = otpResetPasswordForm;

	const tokenResetPasswordForm = superForm(resolveTokenFormState(), {
		id: "reset-password-token-form",
		validators: zod4Client(resetPasswordSchema)
	});
	const {
		form: tokenForm,
		errors: tokenErrors,
		submitting: tokenSubmitting,
		enhance: enhanceTokenResetForm
	} = tokenResetPasswordForm;

	const resendResetForm = superForm(resolveResendFormState(), {
		id: "reset-password-resend-form",
		validators: zod4Client(forgotPasswordSchema)
	});
	const {
		form: resendForm,
		errors: resendErrors,
		message: resendMessage,
		submitting: resendSubmitting,
		enhance: enhanceResendForm
	} = resendResetForm;

	const challengeContextAvailable = $derived($otpForm.challengeId.trim().length > 0);
</script>

<svelte:head>
	<title>Reset Password • ProjectBook</title>
	<meta
		name="description"
		content="Reset your ProjectBook password using the OTP sent to your email."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<main class="flex min-h-screen items-center justify-center p-4 sm:p-8">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-2 text-center">
			{#if data.challengeMode}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
					<MailCheck class="size-6 text-primary" />
				</div>
				<Card.Title>Reset Password With OTP</Card.Title>
				<Card.Description>Enter your reset code and set a new password.</Card.Description>
			{:else if data.tokenMode}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
					<ShieldCheck class="size-6 text-primary" />
				</div>
				<Card.Title>Reset Password</Card.Title>
				<Card.Description>Legacy reset link detected. Set your new password.</Card.Description>
			{:else}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15">
					<AlertTriangle class="size-6 text-destructive" />
				</div>
				<Card.Title>Invalid or expired token</Card.Title>
				<Card.Description>Please request a new password reset link.</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-4">
			{#if data.challengeMode}
				<form
					method="POST"
					action="?/resetOtp"
					class="space-y-4"
					use:enhanceOtpResetForm
					novalidate
				>
					<input type="hidden" name="challengeId" bind:value={$otpForm.challengeId} />

					<div class="space-y-2">
						<Label for="reset-code">Reset Code</Label>
						<Input
							id="reset-code"
							name="code"
							type="text"
							inputmode="numeric"
							autocomplete="one-time-code"
							maxlength={6}
							placeholder="Enter 6-digit code"
							bind:value={$otpForm.code}
							aria-invalid={$otpErrors.code?.length ? "true" : "false"}
						/>
						{#if $otpErrors.code?.length}
							<p class="text-xs text-destructive">{$otpErrors.code[0]}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="new-password">New Password</Label>
						<Input
							id="new-password"
							name="password"
							type="password"
							placeholder="Min 10 chars with upper, lower, number, special"
							bind:value={$otpForm.password}
							aria-invalid={$otpErrors.password?.length ? "true" : "false"}
						/>
						{#if $otpErrors.password?.length}
							<p class="text-xs text-destructive">{$otpErrors.password[0]}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="confirm-new-password">Confirm Password</Label>
						<Input
							id="confirm-new-password"
							name="confirmPassword"
							type="password"
							placeholder="Re-enter new password"
							bind:value={$otpForm.confirmPassword}
							aria-invalid={$otpErrors.confirmPassword?.length ? "true" : "false"}
						/>
						{#if $otpErrors.confirmPassword?.length}
							<p class="text-xs text-destructive">{$otpErrors.confirmPassword[0]}</p>
						{/if}
					</div>

					{#if !challengeContextAvailable}
						<div class="rounded-md border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
							Reset challenge is missing. Request a new code below.
						</div>
					{/if}

					{#if $otpErrors._errors?.length}
						<p class="text-xs text-destructive">{$otpErrors._errors[0]}</p>
					{/if}

					<Button
						class="w-full"
						type="submit"
						disabled={$otpSubmitting || !challengeContextAvailable}
					>
						{#if $otpSubmitting}
							<LoaderCircle class="size-4 animate-spin" />
							<span>Resetting...</span>
						{:else}
							<span>Reset Password</span>
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
						<Label for="reset-email">Email</Label>
						<Input
							id="reset-email"
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
							<span>Send New Code</span>
						{/if}
					</Button>
				</form>
			{:else if data.tokenMode}
				<form
					method="POST"
					action="?/resetToken"
					class="space-y-4"
					use:enhanceTokenResetForm
					novalidate
				>
					<div class="space-y-2">
						<Label for="token-new-password">New Password</Label>
						<Input
							id="token-new-password"
							name="password"
							type="password"
							placeholder="Min 10 chars with upper, lower, number, special"
							bind:value={$tokenForm.password}
							aria-invalid={$tokenErrors.password?.length ? "true" : "false"}
						/>
						{#if $tokenErrors.password?.length}
							<p class="text-xs text-destructive">{$tokenErrors.password[0]}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="token-confirm-new-password">Confirm Password</Label>
						<Input
							id="token-confirm-new-password"
							name="confirmPassword"
							type="password"
							placeholder="Re-enter new password"
							bind:value={$tokenForm.confirmPassword}
							aria-invalid={$tokenErrors.confirmPassword?.length ? "true" : "false"}
						/>
						{#if $tokenErrors.confirmPassword?.length}
							<p class="text-xs text-destructive">{$tokenErrors.confirmPassword[0]}</p>
						{/if}
					</div>

					{#if $tokenErrors._errors?.length}
						<p class="text-xs text-destructive">{$tokenErrors._errors[0]}</p>
					{/if}

					<Button class="w-full" type="submit" disabled={$tokenSubmitting}>
						{#if $tokenSubmitting}
							<LoaderCircle class="size-4 animate-spin" />
							<span>Resetting...</span>
						{:else}
							<span>Reset Password</span>
						{/if}
					</Button>
				</form>

				<Button class="w-full" variant="outline" href="/auth/forgot-password">
					Request new reset code
				</Button>
			{:else}
				<Button class="w-full" href="/auth/forgot-password">Request new reset</Button>
				<Button class="w-full" variant="outline" href="/auth">Back to Login</Button>
			{/if}

			<Button class="w-full" variant="outline" href="/auth">Back to Login</Button>
		</Card.Content>
	</Card.Root>
</main>
