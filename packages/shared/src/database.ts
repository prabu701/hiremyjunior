// Friendly aliases over the generated schema types. Regenerate with `pnpm db:types`.
import type { Database } from './database.generated';

export type { Database, Json } from './database.generated';

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
export type RpcArgs<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Args'];
export type RpcReturns<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Returns'];

export type Profile = Tables<'profiles'>;
export type Junior = Tables<'juniors'>;
export type Parent = Tables<'parents'>;
export type Employer = Tables<'employers'>;
export type Guardianship = Tables<'guardianships'>;

export type ProfileStatus = Enums<'profile_status'>;
export type ThemeKey = Enums<'theme_key'>;
export type CornerStyle = Enums<'corner_style'>;
export type EmployerKind = Enums<'employer_kind'>;

/** Columns the client may update directly (see column grants in migrations). Everything else goes through RPCs. */
export type ProfileUpdate = Partial<Pick<Profile, 'avatar_url' | 'theme' | 'corner_style'>>;
