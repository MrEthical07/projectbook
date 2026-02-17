<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { AlertTriangle, LoaderCircle, ShieldCheck } from "@lucide/svelte";
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import { resetPasswordSchema } from "$lib/schemas/auth.schema";
	import type { ActionData, PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	const resolveFormState = () => (form as ActionData | null)?.form ?? data.form;

	const resetPasswordForm = superForm(resolveFormState(), {
		validators: zod4Client(resetPasswordSchema)
	});
	const {
		form: resetForm,
		errors: resetErrors,
		submitting: resetSubmitting,
		enhance: enhanceResetForm
	} = resetPasswordForm;
</script>

<main class="flex min-h-screen items-center justify-center p-4 sm:p-8">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-2 text-center">
			{#if data.tokenValid}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
					<ShieldCheck class="size-6 text-primary" />
				</div>
				<Card.Title>Reset Password</Card.Title>
				<Card.Description>Create a new password for your account.</Card.Description>
			{:else}
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15">
					<AlertTriangle class="size-6 text-destructive" />
				</div>
				<Card.Title>Invalid or expired token</Card.Title>
				<Card.Description>Please request a new password reset link.</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-4">
			{#if !data.tokenValid}
				<Button class="w-full" href="/auth/forgot-password">Request new reset</Button>
				<Button class="w-full" variant="outline" href="/auth">Back to Login</Button>
			{:else}
				<form
					method="POST"
					action="?/reset"
					class="space-y-4"
					use:enhanceResetForm
					novalidate
				>
					<div class="space-y-2">
						<Label for="new-password">New Password</Label>
						<Input
							id="new-password"
							name="password"
							type="password"
							placeholder="Min 10 chars with upper, lower, number, special"
							bind:value={$resetForm.password}
							aria-invalid={$resetErrors.password?.length ? "true" : "false"}
						/>
						{#if $resetErrors.password?.length}
							<p class="text-xs text-destructive">{$resetErrors.password[0]}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="confirm-new-password">Confirm Password</Label>
						<Input
							id="confirm-new-password"
							name="confirmPassword"
							type="password"
							placeholder="Re-enter new password"
							bind:value={$resetForm.confirmPassword}
							aria-invalid={$resetErrors.confirmPassword?.length ? "true" : "false"}
						/>
						{#if $resetErrors.confirmPassword?.length}
							<p class="text-xs text-destructive">{$resetErrors.confirmPassword[0]}</p>
						{/if}
					</div>

					{#if $resetErrors._errors?.length}
						<p class="text-xs text-destructive">{$resetErrors._errors[0]}</p>
					{/if}

					<Button class="w-full" type="submit" disabled={$resetSubmitting}>
						{#if $resetSubmitting}
							<LoaderCircle class="size-4 animate-spin" />
							<span>Resetting...</span>
						{:else}
							<span>Reset Password</span>
						{/if}
					</Button>
				</form>

				<Button class="w-full" variant="outline" href="/auth/forgot-password">
					Request new reset link
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
