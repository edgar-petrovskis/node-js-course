import { join } from 'node:path';

import type { Request } from 'express';

import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { GraphQLISODateTime, GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import configuration from './config/configuration';
import { createDatabaseOptions } from './infrastructure/database/data-source';
import { AuthModule } from './interfaces/auth/auth.module';
import { ProductLoader } from './interfaces/graphql/loaders/product.loader';
import {
  OrderItemResolver,
  OrdersResolver,
} from './interfaces/graphql/orders.resolver';
import { OrdersModule } from './interfaces/orders/orders.module';
import { ProductsModule } from './interfaces/products/products.module';
import { UsersModule } from './interfaces/users/users.module';

const isProduction = process.env.NODE_ENV === 'production';
const graphqlTypePaths = [
  join(__dirname, 'interfaces/graphql/**/*.graphql'),
  join(process.cwd(), 'src/interfaces/graphql/**/*.graphql'),
];
const graphqlDefinitions = isProduction
  ? undefined
  : {
      path: join(process.cwd(), 'src/interfaces/graphql/graphql.ts'),
      outputAs: 'class' as const,
    };

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === 'development' ? '.env.local' : '.env',
      ],
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createDatabaseOptions({
          host: configService.getOrThrow<string>('database.host'),
          port: configService.getOrThrow<number>('database.port'),
          username: configService.getOrThrow<string>('database.user'),
          password: configService.getOrThrow<string>('database.password'),
          database: configService.getOrThrow<string>('database.name'),
        }),
        autoLoadEntities: true,
        logging:
          process.env.NODE_ENV !== 'production' ? ['query', 'error'] : false,
        logger:
          process.env.NODE_ENV !== 'production'
            ? 'formatted-console'
            : 'advanced-console',
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: graphqlTypePaths,
      definitions: graphqlDefinitions,
      context: (context: { req: Request }) => ({ req: context.req }),
      resolvers: {
        DateTime: GraphQLISODateTime,
      },
      path: '/graphql',
      playground: !isProduction,
      introspection: !isProduction,
    }),
    AuthModule,
    UsersModule,
    OrdersModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OrdersResolver,
    OrderItemResolver,
    ProductLoader,
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
