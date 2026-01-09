import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import org.apache.http.HttpHost;
import org.apache.http.client.fluent.*;

public class ProxyFileValidatorMultiThread {
    public static void main(String[] args) {
        String inputFile = "webshare_proxies.txt";
        String outputFile = "valid_proxies.txt";
        List<String> validProxies = Collections.synchronizedList(new ArrayList<>());

        // Leer archivo
        List<String> proxies = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new FileReader(inputFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    proxies.add(line.trim());
                }
            }
        } catch (IOException e) {
            System.out.println("❌ Error leyendo archivo: " + e.getMessage());
            return;
        }

        // Pool de hilos configurable (ej: 10 en paralelo)
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);

        for (String proxyLine : proxies) {
            executor.submit(() -> {
                String[] parts = proxyLine.split(":");
                if (parts.length < 4) {
                    System.out.println("⚠️ Formato inválido: " + proxyLine);
                    return;
                }

                String host = parts[0];
                int port;
                try {
                    port = Integer.parseInt(parts[1]);
                } catch (NumberFormatException e) {
                    System.out.println("⚠️ Puerto inválido en: " + proxyLine);
                    return;
                }
                String user = parts[2];
                String pass = parts[3];

                try {
                    HttpHost proxy = new HttpHost(host, port);
                    String res = Executor.newInstance()
                            .auth(proxy, user, pass)
                            .execute(Request.Get("http://ipv4.webshare.io/").viaProxy(proxy))
                            .returnContent().asString();

                    System.out.println("✅ Proxy " + host + ":" + port + " → " + res);
                    validProxies.add(proxyLine);
                } catch (Exception e) {
                    System.out.println("❌ Proxy " + host + ":" + port + " falló: " + e.getMessage());
                }
            });
        }

        // Apagar pool y esperar a que terminen todos
        executor.shutdown();
        try {
            if (!executor.awaitTermination(15, TimeUnit.MINUTES)) {
                System.out.println("⚠️ Tiempo de validación agotado.");
            }
        } catch (InterruptedException e) {
            System.out.println("⚠️ Validación interrumpida: " + e.getMessage());
        }

        // Guardar válidos
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(outputFile))) {
            for (String proxy : validProxies) {
                writer.write(proxy);
                writer.newLine();
            }
            System.out.println("✅ Proxies válidos guardados en: " + outputFile);
        } catch (IOException e) {
            System.out.println("❌ Error escribiendo archivo: " + e.getMessage());
        }
    }
}
