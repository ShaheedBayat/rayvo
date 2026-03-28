import { toast } from 'sonner';

interface SafeActionOptions<T> {
  /** Human-readable action name for error messages */
  actionName: string;
  /** The DB action to perform — must return the created/updated data or null */
  actionFn: () => Promise<T | null>;
  /** 
   * Verification function — called after actionFn succeeds.
   * Should return true if the result is confirmed visible/correct.
   * Receives the action result as argument.
   */
  verifyFn?: (result: T) => Promise<boolean>;
  /** Success message to display after full verification */
  successMessage?: string;
  /** Optional callback on success, after verification */
  onSuccess?: (result: T) => void;
  /** If true, skip the toast on success (caller handles it) */
  silentSuccess?: boolean;
}

/**
 * Executes a database action with strict validation and verification.
 * 
 * Flow:
 * 1. Execute action
 * 2. Validate response exists and has required data
 * 3. Run verification function (e.g. refetch + confirm in list)
 * 4. Only then show success
 * 
 * If ANY step fails → show error, stop, return null.
 */
export async function safeExecuteAction<T>(
  options: SafeActionOptions<T>
): Promise<T | null> {
  const { actionName, actionFn, verifyFn, successMessage, onSuccess, silentSuccess } = options;

  try {
    // Step 1: Execute
    const result = await actionFn();

    // Step 2: Validate response
    if (result === null || result === undefined) {
      console.error(`[SafeAction] ${actionName}: action returned null/undefined`);
      toast.error(`${actionName} failed — no data returned`);
      return null;
    }

    // Check that result has an id if it's an object
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      const obj = result as Record<string, any>;
      if ('id' in obj && !obj.id) {
        console.error(`[SafeAction] ${actionName}: result missing id`, result);
        toast.error(`${actionName} failed — invalid response`);
        return null;
      }
    }

    // Step 3: Verify
    if (verifyFn) {
      const verified = await verifyFn(result);
      if (!verified) {
        console.error(`[SafeAction] ${actionName}: verification failed`, result);
        toast.error(`${actionName} completed but could not be verified — please refresh`);
        return null;
      }
    }

    // Step 4: Success
    console.log(`[SafeAction] ${actionName}: success`, result);
    if (!silentSuccess) {
      toast.success(successMessage || `${actionName} successful`);
    }
    onSuccess?.(result);
    return result;
  } catch (err: any) {
    console.error(`[SafeAction] ${actionName}: unexpected error`, err);
    toast.error(`${actionName} failed: ${err?.message || 'Unknown error'}`);
    return null;
  }
}

/**
 * Wrapper for delete-style actions that return a result object with error/success fields.
 */
export async function safeDeleteAction(options: {
  actionName: string;
  actionFn: () => Promise<{ error: string | null; blocked?: boolean }>;
  verifyFn?: () => Promise<boolean>;
  successMessage?: string;
  onSuccess?: () => void;
}): Promise<boolean> {
  const { actionName, actionFn, verifyFn, successMessage, onSuccess } = options;

  try {
    const result = await actionFn();

    if (result.blocked) {
      toast.error(result.error || 'Account blocked');
      return false;
    }

    if (result.error) {
      toast.error(result.error);
      return false;
    }

    if (verifyFn) {
      const verified = await verifyFn();
      if (!verified) {
        toast.error(`${actionName} completed but could not be verified — please refresh`);
        return false;
      }
    }

    toast.success(successMessage || `${actionName} successful`);
    onSuccess?.();
    return true;
  } catch (err: any) {
    console.error(`[SafeAction] ${actionName}: unexpected error`, err);
    toast.error(`${actionName} failed: ${err?.message || 'Unknown error'}`);
    return false;
  }
}
