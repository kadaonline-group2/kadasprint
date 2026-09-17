import Ajv from "ajv";
import revisionMutationSchema from "../../schemas/revision-mutation.schema.json";
import type { RevisionMutation } from "../types/revision-mutation";

const ajv = new Ajv({ allErrors: true });

export const validateRevisionMutation = ajv.compile<RevisionMutation>(revisionMutationSchema);
