export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId?: string;
}

export function getKafkaConfig(serviceName: string): KafkaConfig {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  return {
    brokers,
    clientId: `daltaners-${serviceName}`,
    groupId: `daltaners-${serviceName}-group`,
  };
}
