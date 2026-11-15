/**
 * Pure-mode preset core plugin.
 *
 * Mounted only inside the `pure` agent preset. It shapes the model request so
 * it contains nothing but the messages the user and the assistant sent:
 *
 *   1. `systemPrompt.section({ complete: true, text: '' })` makes the rendered
 *      system prompt empty, dropping the harness opener, deployment persona,
 *      first-party guidance and every other prompt section.
 *   2. `systemPrompt.suppressRuntimeContext()` removes optional dynamic
 *      runtime-context snapshots (sandbox policy, approval policy, dev context…).
 *   3. DSH's host `dsh-working-directory` service registers a REQUIRED context
 *      `working-directory:current` (the `Current working directory: "…"`
 *      reminder). `suppressRuntimeContext()` never removes required contexts, so
 *      we shadow that exact name with empty text; empty text contributes nothing.
 *   4. The host mounts many GLOBAL tool providers (tool-working-directory,
 *      tool-agent-team, and every enabled host plugin's tools). This preset
 *      mounts no tool plugin and `tools.restrict({ allow: [] })` masks every
 *      inherited global tool, so the request carries no tool schemas.
 *
 * Injected user-role messages (dsh-mnemon memory/instructions, skill catalogs,
 * time context, …) are stripped by the companion host plugin `./host.js`, which
 * can register its per-step filter after those injectors. See that file.
 *
 * @module @local/dsh-pure-mode
 */

/** Cordis plugin name. */
export const name = 'pure-mode'

/** The services this row contributes to. */
export const inject = ['systemPrompt', 'tools']

/**
 * Build the empty-prompt / empty-context / no-tools agent scope.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the preset (agent) scope Context.
 */
export function apply(ctx) {
  // A single complete, empty section becomes the sole system prompt; because
  // there is no text, `renderPrompt` yields `''` and no system message is sent.
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'pure:empty',
    order: 0,
    text: '',
    complete: true,
  }), 'pure-mode.section()')

  // Drop optional runtime-context contributions for this agent scope.
  ctx.effect(() => ctx.systemPrompt.suppressRuntimeContext(), 'pure-mode.suppressRuntimeContext()')

  // Shadow the host's required working-directory context with empty text so the
  // loop admits no `Current working directory` snapshot.
  ctx.effect(() => ctx.systemPrompt.context({
    name: 'working-directory:current',
    order: ctx.systemPrompt.getContextOrder('WORKING_DIRECTORY'),
    required: true,
    interpolate: false,
    text: () => '',
  }), 'pure-mode.workingDirectory()')

  // Hide every tool inherited from the host/global layer; this preset registers
  // no scoped tool of its own, so the model-visible tool set is empty.
  ctx.effect(() => ctx.tools.restrict({ allow: [] }), 'pure-mode.noTools()')
}
