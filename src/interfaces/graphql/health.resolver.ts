import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello GraphQL!';
  }
}
