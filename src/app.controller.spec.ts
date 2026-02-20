import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheService } from './processor/cache.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getStats: jest.fn().mockResolvedValue({
              totalCheckIns: 100,
              totalProcessors: 5,
              lastHourCheckIns: 10,
              last24HoursCheckIns: 50,
              timestamp: Date.now(),
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            getProcessorStatusCacheSize: jest.fn().mockReturnValue(0),
            getProcessorStatusCacheCapacity: jest.fn().mockReturnValue(1000),
            getProcessorCacheSize: jest.fn().mockReturnValue(0),
            getProcessorCacheCapacity: jest.fn().mockReturnValue(1000),
            getNetworkTypeCacheSize: jest.fn().mockReturnValue(0),
            getNetworkTypeCacheCapacity: jest.fn().mockReturnValue(100),
            getSsidCacheSize: jest.fn().mockReturnValue(0),
            getSsidCacheCapacity: jest.fn().mockReturnValue(100),
            getBatteryHealthCacheSize: jest.fn().mockReturnValue(0),
            getBatteryHealthCacheCapacity: jest.fn().mockReturnValue(100),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      expect(await appController.healthCheck()).toBe("I'm healthy");
    });
  });
});
